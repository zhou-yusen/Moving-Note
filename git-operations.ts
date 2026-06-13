import type { TFile, Vault, App } from "obsidian";
import { t } from "./locale";

const CONFLICT_FILE = "conflict-files-moving-note.md";

// Node.js require function, available in Obsidian desktop environment
// Used to access child_process for running git commands
declare const require: (id: string) => unknown;

interface GitStatus {
    modified: string[];
    added: string[];
    deleted: string[];
    conflicted: string[];
    notAdded: string[];
    currentBranch: string;
}

interface ChildProcess {
    stdout: { on: (event: string, cb: (data: Buffer) => void) => void };
    stderr: { on: (event: string, cb: (data: Buffer) => void) => void };
    on: (event: string, cb: (...args: unknown[]) => void) => void;
}

interface NodeFs {
    existsSync(path: string): boolean;
    unlinkSync(path: string): void;
}

interface NodePath {
    join(...segments: string[]): string;
}

/**
 * 直接调用系统 git 命令
 * 用 eval("require") 绕过 Obsidian 模块加载器对 child_process 的拦截
 */
export class GitOperations {
    private cwd: string;
    private app: App;

    constructor(vaultPath: string, app: App) {
        this.cwd = vaultPath;
        this.app = app;
    }

    /**
     * 执行 git 命令（用 spawn，避免空格被 shell 拆分）
     */
    private run(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- Required to spawn git process, Node.js module not available via ES import
            const cp = require("child_process") as { spawn: (cmd: string, args: string[], opts: unknown) => ChildProcess };
            const child = cp.spawn("git", args, { cwd: this.cwd });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
            child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
            child.on("error", (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))));
            child.on("close", (code: unknown) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(stderr.trim() || `git exited with code ${code}`));
                }
            });
        });
    }

    async isRepo(): Promise<boolean> {
        try {
            await this.run(["rev-parse", "--is-inside-work-tree"]);
            return true;
        } catch {
            return false;
        }
    }

    async init(): Promise<void> {
        await this.run(["init"]);
    }

    async addRemote(name: string, url: string): Promise<void> {
        this.cleanStaleLocks();
        try {
            await this.run(["remote", "add", name, url]);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("already exists")) {
                this.cleanStaleLocks();
                await this.run(["remote", "set-url", name, url]);
            } else {
                throw e;
            }
        }
    }

    /**
     * 清理残留的 git 锁文件，防止 "could not lock config file" 错误
     */
    private cleanStaleLocks(): void {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- Required to clean stale git lock files, Node.js module not available via ES import
            const fs = require("fs") as NodeFs;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- Required to construct file paths, Node.js module not available via ES import
            const path = require("path") as NodePath;
            const lockFile = path.join(this.cwd, ".git", "config.lock");
            if (fs.existsSync(lockFile)) {
                fs.unlinkSync(lockFile);
                console.log("[moving-note] Removed stale lock file:", lockFile);
            }
        } catch {
            // 忽略清理失败
        }
    }

    async status(): Promise<GitStatus> {
        const output = await this.run(["status", "--porcelain", "-b"]);
        const lines = output.split("\n").filter((l: string) => l.trim());

        const result: GitStatus = {
            modified: [],
            added: [],
            deleted: [],
            conflicted: [],
            notAdded: [],
            currentBranch: "",
        };

        for (const line of lines) {
            if (line.startsWith("## ")) {
                result.currentBranch = line
                    .substring(3)
                    .split("...")[0]
                    .split(" ")[0];
                continue;
            }

            const s = line.substring(0, 2);
            const f = line.substring(3);

            if (s.includes("U") || s === "AA" || s === "DD") {
                result.conflicted.push(f);
            } else if (s === "??") {
                result.notAdded.push(f);
            } else if (s.startsWith("D") || s.endsWith("D")) {
                result.deleted.push(f);
            } else if (s.startsWith("A")) {
                result.added.push(f);
            } else if (s.startsWith("M") || s.endsWith("M")) {
                result.modified.push(f);
            } else if (s.startsWith("R")) {
                result.modified.push(f.split(" -> ")[1] || f);
            }
        }

        return result;
    }

    async pull(branch?: string): Promise<string> {
        if (branch) {
            return this.run(["pull", "origin", branch]);
        }
        return this.run(["pull"]);
    }

    async commitAll(message: string): Promise<number> {
        await this.run(["add", "-A"]);
        const output = await this.run(["commit", "-m", message]);
        const match = output.match(/(\d+) file[s]? changed/);
        return match ? parseInt(match[1]) : 0;
    }

    async push(branch?: string): Promise<string> {
        const targetBranch = branch || await this.getCurrentBranch();
        try {
            return await this.run(["push", "origin", targetBranch]);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("no upstream branch") || msg.includes("does not match any")) {
                return this.run(["push", "--set-upstream", "origin", targetBranch]);
            }
            throw e;
        }
    }

    async getConflictedFiles(): Promise<string[]> {
        try {
            const output = await this.run([
                "diff",
                "--name-only",
                "--diff-filter=U",
            ]);
            return output
                ? output.split("\n").filter((f: string) => f.trim())
                : [];
        } catch {
            return [];
        }
    }

    async handleConflict(vault: Vault): Promise<void> {
        const conflicted = await this.getConflictedFiles();
        if (conflicted.length === 0) return;

        const lines = [
            t("conflict.heading"),
            "",
            t("conflict.body"),
            "",
            ...conflicted.map((f: string) => `- ${f}`),
            "",
            t("conflict.instruction"),
            t("conflict.note"),
        ];

        const existing = vault.getAbstractFileByPath(CONFLICT_FILE);
        const content = lines.join("\n");
        if (existing instanceof Object && "extension" in existing) {
            await vault.modify(existing as TFile, content);
        } else {
            await vault.create(CONFLICT_FILE, content);
        }
    }

    async deleteConflictFile(vault: Vault): Promise<void> {
        const file = vault.getAbstractFileByPath(CONFLICT_FILE);
        if (file) {
            await this.app.fileManager.trashFile(file);
        }
    }

    async getRemoteUrl(remote: string = "origin"): Promise<string | null> {
        try {
            return await this.run(["remote", "get-url", remote]);
        } catch {
            return null;
        }
    }

    async getCurrentBranch(): Promise<string> {
        return this.run(["branch", "--show-current"]);
    }

    /**
     * 重命名当前分支
     */
    async renameBranch(newName: string): Promise<void> {
        await this.run(["branch", "-M", newName]);
    }

    /**
     * 切换到指定分支（不存在则创建）
     */
    async checkout(branch: string): Promise<void> {
        try {
            await this.run(["checkout", branch]);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("did not match any file") || msg.includes("not a branch")) {
                await this.run(["checkout", "-b", branch]);
            } else {
                throw e;
            }
        }
    }

    /**
     * 暂存未提交的修改
     */
    async stash(): Promise<boolean> {
        try {
            const output = await this.run(["stash", "push", "-m", "moving-note: auto-stash before branch switch"]);
            return !output.includes("No local changes");
        } catch {
            return false;
        }
    }

    /**
     * 恢复暂存的修改
     */
    async stashPop(): Promise<void> {
        try {
            await this.run(["stash", "pop"]);
        } catch {
            console.log("[moving-note] Stash pop failed, changes remain in stash");
        }
    }
}
