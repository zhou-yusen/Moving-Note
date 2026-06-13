import { requestUrl, type Vault, type TFile, type App } from "obsidian";
import type { GitHubFile, CompareResult, LocalFileInfo, TreeItem } from "./types";

const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

export class GitHubApiClient {
    private token: string;
    private owner: string;
    private repo: string;
    private branch: string;
    private app: App;

    constructor(token: string, owner: string, repo: string, branch: string, app: App) {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
        this.app = app;
    }

    private get headers(): Record<string, string> {
        return {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github.v3+json",
        };
    }

    /**
     * 获取最新 commit 的 SHA
     */
    async getLatestCommitSha(): Promise<string> {
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/commits/${this.branch}`,
            headers: this.headers,
        });
        return resp.json.sha;
    }

    /**
     * 获取完整文件树
     */
    async getFileTree(): Promise<GitHubFile[]> {
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`,
            headers: this.headers,
        });
        const data = resp.json;
        if (data.truncated) {
            console.warn("[moving-note] File tree truncated, some files may be missing");
        }
        return data.tree.filter((item: GitHubFile) => item.type === "blob");
    }

    /**
     * 比较两个 commit 之间的变更
     */
    async compareCommits(oldSha: string): Promise<CompareResult> {
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/compare/${oldSha}...${this.branch}`,
            headers: this.headers,
        });
        const data = resp.json;
        return {
            files: data.files.map(
                (f: {
                    filename: string;
                    status: string;
                    previous_filename?: string;
                }) => ({
                    filename: f.filename,
                    status: f.status,
                    previous_filename: f.previous_filename,
                })
            ),
            newSha: data.commits[data.commits.length - 1]?.sha ?? oldSha,
        };
    }

    /**
     * 下载单个文件内容（文本）
     */
    async downloadFileText(path: string): Promise<string> {
        const resp = await requestUrl({
            url: `${RAW_BASE}/${this.owner}/${this.repo}/${this.branch}/${encodeURI(path)}`,
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });
        return resp.text;
    }

    /**
     * 下载单个文件内容（二进制）
     */
    async downloadFileBinary(path: string): Promise<ArrayBuffer> {
        const resp = await requestUrl({
            url: `${RAW_BASE}/${this.owner}/${this.repo}/${this.branch}/${encodeURI(path)}`,
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });
        return resp.arrayBuffer;
    }

    /**
     * 判断文件是否是文本文件（基于扩展名）
     */
    private isTextFile(path: string): boolean {
        const textExtensions = [
            ".md", ".txt", ".json", ".yaml", ".yml", ".xml", ".csv",
            ".css", ".js", ".ts", ".html", ".htm", ".svg", ".toml",
            ".ini", ".cfg", ".conf", ".sh", ".bat", ".py", ".rb",
            ".java", ".c", ".cpp", ".h", ".go", ".rs", ".php",
        ];
        const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
        return textExtensions.includes(ext);
    }

    /**
     * 首次全量同步 — 下载仓库所有文件到 vault
     */
    async fullSync(vault: Vault, onProgress?: (current: number, total: number) => void): Promise<number> {
        const files = await this.getFileTree();
        let count = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // 跳过 .git 相关文件
                if (file.path.startsWith(".git/")) continue;

                // 确保目录存在
                const dir = file.path.substring(0, file.path.lastIndexOf("/"));
                if (dir) {
                    await this.ensureDir(vault, dir);
                }

                // 下载并写入文件
                if (this.isTextFile(file.path)) {
                    const content = await this.downloadFileText(file.path);
                    await this.writeFile(vault, file.path, content);
                } else {
                    const buffer = await this.downloadFileBinary(file.path);
                    await this.writeFileBinary(vault, file.path, buffer);
                }
                count++;
                onProgress?.(i + 1, files.length);
            } catch (e) {
                console.error(`[moving-note] Failed to sync file: ${file.path}`, e);
            }
        }
        return count;
    }

    /**
     * 增量同步 — 只同步变更的文件
     */
    async incrementalSync(
        vault: Vault,
        lastSha: string,
        onProgress?: (current: number, total: number) => void
    ): Promise<{ count: number; newSha: string }> {
        const compare = await this.compareCommits(lastSha);

        // 如果没有变更
        if (compare.files.length === 0) {
            return { count: 0, newSha: lastSha };
        }

        let count = 0;
        const total = compare.files.length;

        for (let i = 0; i < total; i++) {
            const file = compare.files[i];
            try {
                if (file.status === "removed") {
                    // 删除本地文件
                    const existing = vault.getAbstractFileByPath(file.filename);
                    if (existing) {
                        await this.app.fileManager.trashFile(existing, true);
                    }
                    count++;
                } else if (
                    file.status === "added" ||
                    file.status === "modified" ||
                    file.status === "renamed" ||
                    file.status === "copied"
                ) {
                    // 如果是重命名，删除旧文件
                    if (file.status === "renamed" && file.previous_filename) {
                        const old = vault.getAbstractFileByPath(file.previous_filename);
                        if (old) {
                            await this.app.fileManager.trashFile(old, true);
                        }
                    }

                    // 确保目录存在
                    const dir = file.filename.substring(0, file.filename.lastIndexOf("/"));
                    if (dir) {
                        await this.ensureDir(vault, dir);
                    }

                    // 下载并写入
                    if (this.isTextFile(file.filename)) {
                        const content = await this.downloadFileText(file.filename);
                        await this.writeFile(vault, file.filename, content);
                    } else {
                        const buffer = await this.downloadFileBinary(file.filename);
                        await this.writeFileBinary(vault, file.filename, buffer);
                    }
                    count++;
                }
                onProgress?.(i + 1, total);
            } catch (e) {
                console.error(`[moving-note] Failed to sync file: ${file.filename}`, e);
            }
        }

        return { count, newSha: compare.newSha };
    }

    /**
     * 测试 token 是否有效
     */
    async validateToken(): Promise<{ valid: boolean; username?: string }> {
        try {
            const resp = await requestUrl({
                url: `${API_BASE}/user`,
                headers: this.headers,
            });
            return { valid: true, username: resp.json.login };
        } catch {
            return { valid: false };
        }
    }

    // ─── 推送方法（Git Data API）──────────────────────────────

    /**
     * 获取当前分支最新 commit 的 tree SHA
     */
    async getBaseTreeSha(): Promise<string> {
        const commitSha = await this.getLatestCommitSha();
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`,
            headers: this.headers,
        });
        return resp.json.tree.sha;
    }

    /**
     * 创建 blob（用于二进制文件）
     */
    async createBlob(content: string, encoding: "utf-8" | "base64"): Promise<string> {
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/git/blobs`,
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ content, encoding }),
        });
        return resp.json.sha;
    }

    /**
     * 创建新的 tree
     */
    async createTree(baseTreeSha: string, treeItems: TreeItem[]): Promise<string> {
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/git/trees`,
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
        });
        return resp.json.sha;
    }

    /**
     * 创建 commit
     */
    async createCommit(message: string, treeSha: string, parentSha: string): Promise<string> {
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/git/commits`,
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
        });
        return resp.json.sha;
    }

    /**
     * 更新分支引用到新的 commit
     */
    async updateRef(commitSha: string): Promise<void> {
        await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`,
            method: "PATCH",
            headers: this.headers,
            body: JSON.stringify({ sha: commitSha, force: true }),
        });
    }

    /**
     * 批量推送文件到远程仓库
     * 流程：创建 blob（二进制）→ 创建 tree → 创建 commit → 更新 ref
     */
    async pushFiles(files: LocalFileInfo[], commitMessage: string): Promise<string> {
        // 1. 获取 base tree SHA
        const baseTreeSha = await this.getBaseTreeSha();
        const parentSha = await this.getLatestCommitSha();

        // 2. 构建 tree items
        const treeItems: TreeItem[] = [];
        for (const file of files) {
            if (file.encoding === "base64") {
                // 二进制文件：先创建 blob
                const blobSha = await this.createBlob(file.content, "base64");
                treeItems.push({
                    path: file.path,
                    mode: "100644",
                    type: "blob",
                    sha: blobSha,
                });
            } else {
                // 文本文件：直接传 content
                treeItems.push({
                    path: file.path,
                    mode: "100644",
                    type: "blob",
                    content: file.content,
                });
            }
        }

        // 3. 创建新 tree
        const newTreeSha = await this.createTree(baseTreeSha, treeItems);

        // 4. 创建 commit
        const newCommitSha = await this.createCommit(commitMessage, newTreeSha, parentSha);

        // 5. 更新分支引用
        await this.updateRef(newCommitSha);

        return newCommitSha;
    }

    /**
     * 通过 Contents API 删除文件
     */
    async deleteFile(path: string, message: string): Promise<void> {
        // 先获取文件的 SHA（GitHub 要求删除时提供 SHA）
        const resp = await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${encodeURI(path)}?ref=${this.branch}`,
            headers: this.headers,
        });
        const fileSha = resp.json.sha;

        await requestUrl({
            url: `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${encodeURI(path)}`,
            method: "DELETE",
            headers: this.headers,
            body: JSON.stringify({ message, sha: fileSha, branch: this.branch }),
        });
    }

    // ─── 文件操作辅助方法 ─────────────────────────────────────

    private async ensureDir(vault: Vault, dirPath: string): Promise<void> {
        const parts = dirPath.split("/");
        let current = "";
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            if (!(await vault.adapter.exists(current))) {
                await vault.createFolder(current);
            }
        }
    }

    private async writeFile(vault: Vault, path: string, content: string): Promise<void> {
        const existing = vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) {
            await vault.modify(existing, content);
        } else {
            await vault.create(path, content);
        }
    }

    private async writeFileBinary(vault: Vault, path: string, buffer: ArrayBuffer): Promise<void> {
        const existing = vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) {
            await vault.modifyBinary(existing, buffer);
        } else {
            await vault.createBinary(path, buffer);
        }
    }
}
