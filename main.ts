import { Notice, Platform, Plugin } from "obsidian";
import { MovingNoteSettingTab } from "./settings";
import { SyncEngine } from "./sync-engine";
import { DEFAULT_SETTINGS, type MovingNoteSettings, type SyncResult } from "./types";
import { t, setLocaleOverride } from "./locale";

export default class MovingNotePlugin extends Plugin {
    settings: MovingNoteSettings;
    syncEngine: SyncEngine;
    private autoSyncIntervalId: number | null = null;

    async onload() {
        console.log("Loading Moving Note plugin");

        await this.loadSettings();
        setLocaleOverride(this.settings.language || "auto");
        this.syncEngine = new SyncEngine(this.app, this.settings);
        await this.syncEngine.init();

        // Register settings tab
        this.addSettingTab(new MovingNoteSettingTab(this.app, this));

        // Register commands
        this.addCommands();

        // Add Ribbon icon
        this.addRibbonIcon("sync", t("ribbon.sync"), async () => {
            const result = await this.syncNow();
            new Notice(result.message);
        });

        // Listen for settings changed event
        this.registerEvent(
            this.app.workspace.on("moving-note:settings-changed", () => {
                void this.saveSettings();
            })
        );

        // Sync on startup
        if (this.settings.syncOnStartup) {
            this.app.workspace.onLayoutReady(() => {
                window.setTimeout(() => {
                    void (async () => {
                        if (this.isConfigured()) {
                            const result = await this.syncNow();
                            if (result.filesChanged > 0) {
                                new Notice(result.message);
                            }
                        }
                    })();
                }, 2000);
            });
        }

        // Set up auto-sync timer
        this.setupAutoSync();
    }

    onunload() {
        this.clearAutoSync();
        console.log("Unloading Moving Note plugin");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Notify sync engine that settings have been updated
        await this.syncEngine.reload(this.settings);
        this.setupAutoSync();
    }

    /**
     * Check if basic configuration is complete.
     * Desktop only needs the repo URL (git credentials managed by system).
     * Mobile needs repo URL + Token.
     */
    private isConfigured(): boolean {
        if (!this.settings.repoUrl) return false;
        // Desktop: only needs repo URL
        // Mobile: also needs Token
        if (Platform.isMobile && !this.settings.githubToken) return false;
        return true;
    }

    /**
     * Register all commands
     */
    private addCommands() {
        this.addCommand({
            id: "sync",
            name: t("cmd.sync"),
            icon: "sync",
            callback: async () => {
                const result = await this.syncNow();
                new Notice(result.message);
            },
        });

        this.addCommand({
            id: "pull",
            name: t("cmd.pull"),
            icon: "download",
            callback: async () => {
                const result = await this.syncEngine.pull();
                new Notice(result.message);
            },
        });

        this.addCommand({
            id: "push",
            name: t("cmd.push"),
            icon: "upload",
            checkCallback: (checking) => {
                if (this.isConfigured()) {
                    if (!checking) {
                        void this.push().then((r) => new Notice(r.message));
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: "show-status",
            name: t("cmd.status"),
            icon: "info",
            callback: () => {
                this.showStatus();
            },
        });
    }

    /**
     * Execute sync
     */
    async syncNow(): Promise<SyncResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: t("notice.notConfigured"),
                filesChanged: 0,
            };
        }
        new Notice(t("notice.syncing"), 3000);
        return this.syncEngine.sync();
    }

    /**
     * Push
     */
    private async push(): Promise<SyncResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: t("notice.notConfigured"),
                filesChanged: 0,
            };
        }
        return this.syncEngine.push();
    }

    /**
     * Show current status
     */
    private showStatus() {
        const s = this.settings;
        if (!this.isConfigured()) {
            new Notice(t("notice.notConfiguredRepo"));
            return;
        }
        const lines = [
            t("notice.status_repo", { repo: `${s.repoOwner}/${s.repoName}` }),
            t("notice.status_branch", { branch: s.branch }),
            s.lastSyncSha
                ? t("notice.status_lastSync", { sha: s.lastSyncSha.substring(0, 8) })
                : t("notice.status_lastSync_never"),
            s.autoSyncInterval > 0
                ? t("notice.status_autoSync", { interval: s.autoSyncInterval })
                : t("notice.status_autoSync_disabled"),
        ];
        new Notice(lines.join("\n"), 8000);
    }

    /**
     * Set up auto-sync timer
     */
    private setupAutoSync() {
        this.clearAutoSync();
        if (
            this.settings.autoSyncInterval > 0 &&
            this.isConfigured()
        ) {
            this.autoSyncIntervalId = window.setInterval(
                () => {
                    void (async () => {
                        const result = await this.syncNow();
                        if (result.filesChanged > 0) {
                            new Notice(result.message);
                        }
                    })();
                },
                this.settings.autoSyncInterval * 60 * 1000
            );
        }
    }

    /**
     * Clear auto-sync timer
     */
    private clearAutoSync() {
        if (this.autoSyncIntervalId !== null) {
            window.clearInterval(this.autoSyncIntervalId);
            this.autoSyncIntervalId = null;
        }
    }
}
