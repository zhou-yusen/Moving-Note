import { Platform, Notice, type App } from "obsidian";
import { parseRepoUrl, type MovingNoteSettings, type SyncResult, type LocalFileInfo } from "./types";
import { GitOperations } from "./git-operations";
import { GitHubApiClient } from "./github-api";
import { t } from "./locale";

export class SyncEngine {
    private app: App;
    private settings: MovingNoteSettings;
    private gitOps: GitOperations | null = null;
    private githubClient: GitHubApiClient | null = null;
    private isSyncing = false;

    constructor(app: App, settings: MovingNoteSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * 初始化同步引擎（根据平台选择实现）
     */
    async init(): Promise<void> {
        if (!this.settings.repoUrl) {
            return;
        }

        if (Platform.isDesktopApp) {
            await this.initDesktop();
        } else {
            this.initMobile();
        }
    }

    private async initDesktop(): Promise<void> {
        try {
            const vaultPath = (this.app.vault.adapter as { basePath?: string }).basePath;
            if (!vaultPath) {
                console.error("[moving-note] Cannot get vault path");
                return;
            }

            this.gitOps = new GitOperations(vaultPath, this.app);

            // 如果不是 git 仓库，初始化
            const isRepo = await this.gitOps.isRepo();
            if (!isRepo) {
                await this.gitOps.init();
                await this.gitOps.renameBranch(this.settings.branch);
                new Notice(t("notice.gitInit"));
            }

            // 无论新旧仓库，都确保远程地址正确
            await this.gitOps.addRemote("origin", this.settings.repoUrl);
        } catch (e) {
            console.error("[moving-note] Failed to init desktop git:", e);
        }
    }

    private initMobile(): void {
        if (!this.settings.githubToken || !this.settings.repoUrl) {
            return;
        }
        const parsed = parseRepoUrl(this.settings.repoUrl);
        if (!parsed) {
            console.error("[moving-note] Invalid repo URL:", this.settings.repoUrl);
            return;
        }
        this.githubClient = new GitHubApiClient(
            this.settings.githubToken,
            parsed.owner,
            parsed.repo,
            this.settings.branch,
            this.app
        );
    }

    /**
     * 完整同步流程
     * - 桌面端：pull → commit → push
     * - 移动端：增量同步（只拉取远程变更）
     */
    async sync(): Promise<SyncResult> {
        if (this.isSyncing) {
            return { success: false, message: t("sync.alreadySyncing"), filesChanged: 0 };
        }

        this.isSyncing = true;
        try {
            if (Platform.isDesktopApp) {
                return await this.syncDesktop();
            } else {
                return await this.syncMobile();
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, message: t("sync.failed", {msg}), filesChanged: 0 };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 桌面端同步：pull → commit → push
     */
    private async syncDesktop(): Promise<SyncResult> {
        if (!this.gitOps) {
            return { success: false, message: t("sync.gitNotInit"), filesChanged: 0 };
        }

        // 删除冲突文件
        await this.gitOps.deleteConflictFile(this.app.vault);

        // 确保远程地址与设置一致（防止换仓库后 pull/push 目标错误）
        if (this.settings.repoUrl) {
            await this.gitOps.addRemote("origin", this.settings.repoUrl);
        }

        // 确保在正确的分支上
        await this.ensureBranch();

        // 先拉取（远程无此分支时跳过，如首次推送到新分支）
        try {
            await this.gitOps.pull(this.settings.branch);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("couldn't find remote ref") || msg.includes("no upstream branch")) {
                console.log("[moving-note] Remote branch not found, skipping pull");
            } else {
                // 拉取失败可能是冲突
                const conflicted = await this.gitOps.getConflictedFiles();
                if (conflicted.length > 0) {
                    await this.gitOps.handleConflict(this.app.vault);
                    return {
                        success: false,
                        message: t("sync.conflict", {count: conflicted.length}),
                        filesChanged: 0,
                    };
                }
                console.log("[moving-note] Pull failed:", e);
            }
        }

        // 检查是否有变更需要提交
        const status = await this.gitOps.status();
        const hasChanges =
            status.modified.length > 0 ||
            status.notAdded.length > 0 ||
            status.deleted.length > 0;

        let committed = 0;
        if (hasChanges) {
            const message = this.formatCommitMessage();
            committed = await this.gitOps.commitAll(message);

            // 推送
            try {
                await this.gitOps.push(this.settings.branch);
            } catch (e) {
                return {
                    success: true,
                    message: t("sync.committed", {count: committed, msg: e instanceof Error ? e.message : String(e)}),
                    filesChanged: committed,
                };
            }
        }

        return {
            success: true,
            message: committed > 0
                ? t("sync.synced", {count: committed})
                : t("sync.upToDate"),
            filesChanged: committed,
        };
    }

    /**
     * 移动端同步：拉取远程更新 + 推送本地变更
     */
    private async syncMobile(): Promise<SyncResult> {
        if (!this.githubClient) {
            return {
                success: false,
                message: t("sync.noToken"),
                filesChanged: 0,
            };
        }

        const lastSha = this.settings.lastSyncSha;

        if (!lastSha) {
            // 首次同步 — 全量下载 + 记录文件列表
            new Notice(t("notice.firstSync"));
            const count = await this.githubClient.fullSync(
                this.app.vault,
                (current, total) => {
                    if (current % 10 === 0 || current === total) {
                        new Notice(t("notice.syncProgress", {current, total}), 2000);
                    }
                }
            );

            // 保存同步点和文件列表
            const newSha = await this.githubClient.getLatestCommitSha();
            this.settings.lastSyncSha = newSha;
            this.settings.lastSyncFiles = await this.scanVaultFiles();
            await this.saveSettings();

            return {
                success: true,
                message: t("sync.firstSyncDone", {count}),
                filesChanged: count,
            };
        }

        // ─── 增量同步：先拉后推 ───

        // 1. 检测本地变更
        const currentFiles = await this.scanVaultFiles();
        const localChanges = this.detectChanges(this.settings.lastSyncFiles, currentFiles);
        const hasLocalChanges =
            localChanges.added.length > 0 ||
            localChanges.modified.length > 0 ||
            localChanges.deleted.length > 0;

        // 2. 拉取远程更新
        const { count: pullCount } = await this.githubClient.incrementalSync(
            this.app.vault,
            lastSha
        );

        // 3. 推送本地变更
        let pushCount = 0;
        if (hasLocalChanges) {
            try {
                pushCount = await this.pushLocalChanges(localChanges);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return {
                    success: pullCount > 0,
                    message: t("sync.pullOkPushFail", {pullCount, msg}),
                    filesChanged: pullCount,
                };
            }
        }

        // 4. 更新同步状态
        const finalSha = await this.githubClient.getLatestCommitSha();
        this.settings.lastSyncSha = finalSha;
        this.settings.lastSyncFiles = await this.scanVaultFiles();
        await this.saveSettings();

        const total = pullCount + pushCount;
        if (total === 0) {
            return { success: true, message: t("sync.upToDate"), filesChanged: 0 };
        }

        const parts: string[] = [];
        if (pullCount > 0) parts.push(t("sync.pull", {count: pullCount}));
        if (pushCount > 0) parts.push(t("sync.push", {count: pushCount}));
        return {
            success: true,
            message: t("sync.complete", {parts: parts.join(", ")}),
            filesChanged: total,
        };
    }

    /**
     * 遍历 vault 中所有文件，计算 git SHA1
     */
    private async scanVaultFiles(): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const allFiles = this.app.vault.getFiles();

        for (const file of allFiles) {
            // 跳过配置目录
            if (file.path.startsWith(this.app.vault.configDir + "/")) continue;

            try {
                const buffer = await this.app.vault.readBinary(file as import("obsidian").TFile);
                const sha = await this.computeGitSha1(buffer);
                files[file.path] = sha;
            } catch {
                // 跳过读取失败的文件
            }
        }
        return files;
    }

    /**
     * 计算 git blob 的 SHA1
     * git 格式：blob {size}\0{content}
     */
    private async computeGitSha1(content: ArrayBuffer): Promise<string> {
        const size = content.byteLength;
        const prefix = new TextEncoder().encode(`blob ${size}\0`);
        const data = new Uint8Array(prefix.length + content.byteLength);
        data.set(prefix, 0);
        data.set(new Uint8Array(content), prefix.length);
        const hash = await crypto.subtle.digest("SHA-1", data);
        return Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    /**
     * 对比两次文件扫描结果，检测本地变更
     */
    private detectChanges(
        oldFiles: Record<string, string>,
        newFiles: Record<string, string>
    ): { added: string[]; modified: string[]; deleted: string[] } {
        const added: string[] = [];
        const modified: string[] = [];
        const deleted: string[] = [];

        // 新增和修改
        for (const [path, sha] of Object.entries(newFiles)) {
            if (!(path in oldFiles)) {
                added.push(path);
            } else if (oldFiles[path] !== sha) {
                modified.push(path);
            }
        }

        // 删除
        for (const path of Object.keys(oldFiles)) {
            if (!(path in newFiles)) {
                deleted.push(path);
            }
        }

        return { added, modified, deleted };
    }

    /**
     * 推送本地变更到远程（通过 Git Data API）
     */
    private async pushLocalChanges(
        changes: { added: string[]; modified: string[]; deleted: string[] }
    ): Promise<number> {
        if (!this.githubClient) return 0;

        const files: LocalFileInfo[] = [];

        // 处理新增和修改的文件
        for (const path of [...changes.added, ...changes.modified]) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (!file || !("extension" in file)) continue;

            if (this.githubClient["isTextFile"](path)) {
                const content = await this.app.vault.read(file as import("obsidian").TFile);
                files.push({ path, content, encoding: "utf-8", mode: "100644" });
            } else {
                const buffer = await this.app.vault.readBinary(file as import("obsidian").TFile);
                const base64 = this.arrayBufferToBase64(buffer);
                files.push({ path, content: base64, encoding: "base64", mode: "100644" });
            }
        }

        // 推送新增和修改
        let count = 0;
        if (files.length > 0) {
            const message = this.formatCommitMessage();
            await this.githubClient.pushFiles(files, message);
            count += files.length;
        }

        // 删除文件（逐个通过 Contents API）
        for (const path of changes.deleted) {
            try {
                const message = this.formatCommitMessage();
                await this.githubClient.deleteFile(path, message);
                count++;
            } catch (e) {
                console.error(`[moving-note] Failed to delete file: ${path}`, e);
            }
        }

        return count;
    }

    /**
     * ArrayBuffer 转 Base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * 仅拉取（桌面端 git pull，移动端 API 同步）
     */
    async pull(): Promise<SyncResult> {
        try {
            if (Platform.isDesktopApp && this.gitOps) {
                if (this.settings.repoUrl) {
                    await this.gitOps.addRemote("origin", this.settings.repoUrl);
                }
                await this.ensureBranch();
                await this.gitOps.pull(this.settings.branch);
                return { success: true, message: t("sync.pullDone"), filesChanged: 0 };
            } else if (this.githubClient) {
                // 移动端：只拉取，不推送
                const lastSha = this.settings.lastSyncSha;
                if (!lastSha) {
                    return { success: false, message: t("sync.pullNeedFirst"), filesChanged: 0 };
                }
                const { count, newSha } = await this.githubClient.incrementalSync(this.app.vault, lastSha);
                if (count > 0) {
                    this.settings.lastSyncSha = newSha;
                    this.settings.lastSyncFiles = await this.scanVaultFiles();
                    await this.saveSettings();
                }
                return {
                    success: true,
                    message: count > 0 ? t("sync.pulled", {count}) : t("sync.upToDate"),
                    filesChanged: count,
                };
            }
            return { success: false, message: t("sync.notConfigured"), filesChanged: 0 };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, message: t("sync.pullFailed", {msg}), filesChanged: 0 };
        }
    }

    /**
     * 仅推送（桌面端 git push，移动端 API 推送）
     */
    async push(): Promise<SyncResult> {
        if (Platform.isDesktopApp) {
            return this.pushDesktop();
        } else {
            return this.pushMobile();
        }
    }

    private async pushDesktop(): Promise<SyncResult> {
        if (!this.gitOps) {
            return { success: false, message: t("sync.gitNotInit"), filesChanged: 0 };
        }

        try {
            if (this.settings.repoUrl) {
                await this.gitOps.addRemote("origin", this.settings.repoUrl);
            }
            await this.ensureBranch();

            const status = await this.gitOps.status();
            const hasChanges =
                status.modified.length > 0 ||
                status.notAdded.length > 0 ||
                status.deleted.length > 0;

            if (hasChanges) {
                const message = this.formatCommitMessage();
                await this.gitOps.commitAll(message);
            }

            await this.gitOps.push(this.settings.branch);
            return { success: true, message: t("sync.pushDone"), filesChanged: 0 };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, message: t("sync.pushFailed", {msg}), filesChanged: 0 };
        }
    }

    private async pushMobile(): Promise<SyncResult> {
        if (!this.githubClient) {
            return { success: false, message: t("sync.noToken"), filesChanged: 0 };
        }

        try {
            const currentFiles = await this.scanVaultFiles();
            const localChanges = this.detectChanges(this.settings.lastSyncFiles, currentFiles);
            const hasChanges =
                localChanges.added.length > 0 ||
                localChanges.modified.length > 0 ||
                localChanges.deleted.length > 0;

            if (!hasChanges) {
                return { success: true, message: t("sync.noLocalChanges"), filesChanged: 0 };
            }

            const count = await this.pushLocalChanges(localChanges);

            // 更新同步状态
            const newSha = await this.githubClient.getLatestCommitSha();
            this.settings.lastSyncSha = newSha;
            this.settings.lastSyncFiles = await this.scanVaultFiles();
            await this.saveSettings();

            return { success: true, message: t("sync.pushComplete", {count}), filesChanged: count };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, message: t("sync.pushFailed", {msg}), filesChanged: 0 };
        }
    }

    /**
     * 确保当前在设置中的分支上，不在则切换（不存在则创建）
     */
    private async ensureBranch(): Promise<void> {
        if (!this.gitOps || !this.settings.branch) return;
        const current = await this.gitOps.getCurrentBranch();
        if (current !== this.settings.branch) {
            console.log(`[moving-note] Switching branch: ${current} → ${this.settings.branch}`);
            // 暂存未提交的修改，防止 checkout 被阻塞
            const stashed = await this.gitOps.stash();
            await this.gitOps.checkout(this.settings.branch);
            if (stashed) {
                await this.gitOps.stashPop();
            }
        }
    }

    /**
     * 格式化提交消息
     */
    private formatCommitMessage(): string {
        const now = new Date();
        const date = now.toISOString().replace("T", " ").substring(0, 19);
        const hostname = this.settings.repoOwner;
        return this.settings.commitMessage
            .replace("{{date}}", date)
            .replace("{{hostname}}", hostname);
    }

    /**
     * 设置变更后重新加载
     */
    async reload(settings: MovingNoteSettings): Promise<void> {
        this.settings = settings;
        this.gitOps = null;
        this.githubClient = null;
        await this.init();
    }

    private async saveSettings(): Promise<void> {
        // 由主插件类注入
        this.app.workspace.trigger("moving-note:settings-changed");
    }
}
