export interface MovingNoteSettings {
    /** 远程仓库 URL (完整地址，如 https://github.com/user/repo.git) */
    repoUrl: string;
    /** 同步的分支名 */
    branch: string;
    /** GitHub Personal Access Token (自动填充或手动输入) */
    githubToken: string;
    /** GitHub 用户名 (登录后自动填充) */
    githubUsername: string;
    /** 自动同步间隔（分钟），0 = 禁用 */
    autoSyncInterval: number;
    /** 启动时自动同步 */
    syncOnStartup: boolean;
    /** 默认提交消息模板 */
    commitMessage: string;
    /** 上次同步时的 commit SHA (用于增量同步) */
    lastSyncSha: string;
    /** 上次同步时的文件列表 (path → sha，用于移动端变更检测) */
    lastSyncFiles: Record<string, string>;
    /** 显示语言 */
    language: "auto" | "en" | "zh";
}

export const DEFAULT_SETTINGS: MovingNoteSettings = {
    repoUrl: "",
    branch: "main",
    githubToken: "",
    githubUsername: "",
    autoSyncInterval: 0,
    syncOnStartup: true,
    commitMessage: "vault backup: {{date}}",
    lastSyncSha: "",
    lastSyncFiles: {},
    language: "auto",
};

export interface SyncResult {
    success: boolean;
    message: string;
    filesChanged: number;
}

export interface GitHubFile {
    path: string;
    sha: string;
    size: number;
    type: "blob" | "tree";
}

export interface GitHubCommit {
    sha: string;
    message: string;
    date: string;
}

export interface CompareResult {
    files: {
        filename: string;
        status: "added" | "modified" | "removed" | "renamed" | "copied";
        previous_filename?: string;
    }[];
    newSha: string;
}

export interface LocalFileInfo {
    path: string;
    content: string;
    encoding: "utf-8" | "base64";
    mode: "100644";
}

export interface TreeItem {
    path: string;
    mode: "100644";
    type: "blob";
    sha?: string | null;
    content?: string;
}

/**
 * 解析 GitHub 仓库 URL，提取 owner 和 repo
 * 支持格式：
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   git@github.com:owner/repo.git
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
    // HTTPS 格式
    let match = url.match(/github\.com[/:]([^/]+)\/([^/.#?]+)/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    return null;
}
