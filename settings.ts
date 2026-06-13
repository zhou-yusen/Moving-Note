import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type MovingNotePlugin from "./main";
import { parseRepoUrl } from "./types";
import { validateToken } from "./github-auth";
import { SYNC_ICON } from "./sync-icon";
import { t, setLocaleOverride } from "./locale";

/**
 * GitHub Fine-grained Token 创建链接
 * 预填了 repo 权限，用户只需点确认再复制 Token
 */
const CREATE_TOKEN_URL =
    "https://github.com/settings/tokens/new" +
    "?scopes=repo" +
    "&description=Moving+Note+Obsidian+Plugin";

export class MovingNoteSettingTab extends PluginSettingTab {
    plugin: MovingNotePlugin;

    constructor(app: App, plugin: MovingNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // ─── Language selector ────────────────────────────
        new Setting(containerEl)
            .setName(t("settings.language"))
            .setDesc(t("settings.language_desc"))
            .addDropdown((dropdown) => {
                dropdown.addOption("auto", "Auto");
                dropdown.addOption("en", "English");
                dropdown.addOption("zh", "中文");
                dropdown.setValue(this.plugin.settings.language || "auto");
                dropdown.onChange(async (value) => {
                    this.plugin.settings.language = value as "auto" | "en" | "zh";
                    await this.plugin.saveSettings();
                    setLocaleOverride(this.plugin.settings.language);
                    this.display();
                });
            });

        // ─── Sync ────────────────────────────────────────
        new Setting(containerEl).setName(t("settings.heading.sync")).setHeading();

        new Setting(containerEl)
            .setName(t("settings.syncDocs"))
            .setDesc(t("settings.syncDocs_desc"))
            .addButton((btn) => {
                btn.buttonEl.addClass("moving-note-sync-btn");
                btn.buttonEl.innerHTML = "";
                const img = btn.buttonEl.createEl("img");
                img.src = SYNC_ICON;
                img.addEventListener("click", () => {
                    img.addClass("syncing");
                    void (async () => {
                        const result = await this.plugin.syncNow();
                        new Notice(result.message);
                        img.removeClass("syncing");
                    })();
                });
            });

        // Status hint
        if (this.plugin.settings.lastSyncSha) {
            const statusP = containerEl.createEl("p");
            statusP.textContent = t("settings.lastSync", {
                sha: this.plugin.settings.lastSyncSha.substring(0, 8),
            });
            statusP.addClass("moving-note-status");
        }

        // ─── Sync Settings ───────────────────────────────
        new Setting(containerEl).setName(t("settings.heading.syncSettings")).setHeading();

        new Setting(containerEl)
            .setName(t("settings.autoSyncInterval"))
            .setDesc(t("settings.autoSyncInterval_desc"))
            .addText((text) => {
                text.inputEl.type = "number";
                text.setPlaceholder("0")
                    .setValue(
                        String(this.plugin.settings.autoSyncInterval)
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.autoSyncInterval = Math.max(
                            0,
                            Number(value) || 0
                        );
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(t("settings.syncOnStartup"))
            .setDesc(t("settings.syncOnStartup_desc"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.syncOnStartup)
                    .onChange(async (value) => {
                        this.plugin.settings.syncOnStartup = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("settings.commitMsg"))
            .setDesc(t("settings.commitMsg_desc"))
            .addText((text) =>
                text
                    .setPlaceholder(t("settings.commitMsg_placeholder"))
                    .setValue(this.plugin.settings.commitMessage)
                    .onChange(async (value) => {
                        this.plugin.settings.commitMessage =
                            value || "vault backup: {{date}}";
                        await this.plugin.saveSettings();
                    })
            );

        // ─── Remote Repository ───────────────────────────
        new Setting(containerEl).setName(t("settings.heading.remote")).setHeading();

        new Setting(containerEl)
            .setName(t("settings.repoUrl"))
            .setDesc(t("settings.repoUrl_desc"))
            .addText((text) => {
                text.setPlaceholder(t("settings.repoUrl_placeholder"))
                    .setValue(this.plugin.settings.repoUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.repoUrl = value.trim();
                        await this.plugin.saveSettings();
                        this.display();
                    });
                text.inputEl.addClass("moving-note-full-width");
            });

        // Display parsed result
        const parsed = parseRepoUrl(this.plugin.settings.repoUrl);
        if (parsed) {
            const desc = containerEl.createEl("p");
            desc.textContent = t("settings.parsed", {
                owner: parsed.owner,
                repo: parsed.repo,
            });
            desc.addClass("moving-note-parsed");
        } else if (this.plugin.settings.repoUrl) {
            const desc = containerEl.createEl("p");
            desc.textContent = t("settings.parseError");
            desc.addClass("moving-note-parse-error");
        }

        new Setting(containerEl)
            .setName(t("settings.branch"))
            .setDesc(t("settings.branch_desc"))
            .addText((text) =>
                text
                    .setPlaceholder("main")
                    .setValue(this.plugin.settings.branch)
                    .onChange(async (value) => {
                        this.plugin.settings.branch =
                            value.trim() || "main";
                        await this.plugin.saveSettings();
                    })
            );

        // ─── GitHub Login ────────────────────────────────
        new Setting(containerEl).setName(t("settings.heading.github")).setHeading();

        if (this.plugin.settings.githubToken) {
            // Logged in
            new Setting(containerEl)
                .setName(t("settings.loggedIn", {
                    username: this.plugin.settings.githubUsername || t("settings.loggedIn_default"),
                }))
                .setDesc(t("settings.loggedIn_desc"))
                .addButton((btn) =>
                    btn.setButtonText(t("settings.logout")).onClick(async () => {
                        this.plugin.settings.githubToken = "";
                        this.plugin.settings.githubUsername = "";
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );
        } else {
            // Not logged in — guide to create Token
            new Setting(containerEl)
                .setName(t("settings.step1"))
                .setDesc(t("settings.step1_desc"))
                .addButton((btn) => {
                    btn.setButtonText(t("settings.step1_btn"))
                        .setCta()
                        .onClick(() => {
                            window.open(CREATE_TOKEN_URL, "_blank");
                        });
                });

            // Token input
            new Setting(containerEl)
                .setName(t("settings.step2"))
                .setDesc(t("settings.step2_desc"))
                .addText((text) => {
                    text.inputEl.type = "password";
                    text.inputEl.addClass("moving-note-full-width");
                    text.setPlaceholder(t("settings.token_placeholder"))
                        .setValue(this.plugin.settings.githubToken)
                        .onChange(async (value) => {
                            this.plugin.settings.githubToken = value.trim();
                        });
                })
                .addButton((btn) =>
                    btn.setButtonText(t("settings.verify")).onClick(async () => {
                        if (!this.plugin.settings.githubToken) {
                            new Notice(t("settings.pasteFirst"));
                            return;
                        }
                        btn.setButtonText(t("settings.verifying"));
                        btn.setDisabled(true);
                        const result = await validateToken(
                            this.plugin.settings.githubToken
                        );
                        if (result.valid) {
                            this.plugin.settings.githubUsername =
                                result.username || "";
                            await this.plugin.saveSettings();
                            new Notice(
                                t("settings.loginSuccess", { username: result.username })
                            );
                            this.display();
                        } else {
                            new Notice(t("settings.loginFailed"));
                            btn.setButtonText(t("settings.verify"));
                            btn.setDisabled(false);
                        }
                    })
                );
        }

        // Hints
        if (!this.plugin.settings.repoUrl) {
            const hintP = containerEl.createEl("p");
            hintP.textContent = t("settings.hint.noRepo");
            hintP.addClass("moving-note-hint");
        } else if (!this.plugin.settings.githubToken) {
            const hintP = containerEl.createEl("p");
            hintP.textContent = t("settings.hint.noToken");
            hintP.addClass("moving-note-hint");
        }

        // ─── Support Author ──────────────────────────────
        new Setting(containerEl).setName(t("settings.heading.support")).setHeading();

        new Setting(containerEl)
            .setName(t("settings.donate"))
            .setDesc(t("settings.donate_desc"))
            .addButton((bt) => {
                const link = bt.buttonEl.parentElement?.createEl("a", {
                    href: "https://ko-fi.com/gregweaver",
                    attr: {
                        target: "_blank",
                    },
                });
                if (link) {
                    link.createEl("img", {
                        attr: {
                            height: "36",
                            style: "border:0px;height:36px;",
                            src: "https://cdn.ko-fi.com/cdn/kofi3.png?v=3",
                            border: "0",
                            alt: "Buy Me a Coffee at ko-fi.com",
                        },
                    });
                    bt.buttonEl.remove();
                }
            });
    }
}
