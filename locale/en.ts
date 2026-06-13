const en: Record<string, string> = {
    // ─── Settings: headings ─────────────────────────
    "settings.heading.sync": "Sync",
    "settings.heading.syncSettings": "Sync Settings",
    "settings.heading.remote": "Remote Repository",
    "settings.heading.github": "GitHub Login",
    "settings.heading.support": "Support Author",

    // ─── Settings: sync section ─────────────────────
    "settings.syncDocs": "Sync Documents",
    "settings.syncDocs_desc": "Click the button to sync your documents",
    "settings.lastSync": "Last sync: commit {{sha}}",

    // ─── Settings: sync settings ────────────────────
    "settings.autoSyncInterval": "Auto-sync interval (minutes)",
    "settings.autoSyncInterval_desc": "Set to 0 to disable auto-sync",
    "settings.syncOnStartup": "Sync on startup",
    "settings.syncOnStartup_desc": "Automatically sync once when Obsidian starts",
    "settings.commitMsg": "Commit message template",
    "settings.commitMsg_desc": "Available placeholders: {{date}}, {{hostname}}",
    "settings.commitMsg_placeholder": "vault backup: {{date}}",

    // ─── Settings: remote repo ──────────────────────
    "settings.repoUrl": "Repository URL",
    "settings.repoUrl_desc": "Full URL of the GitHub repository (HTTPS or SSH)",
    "settings.repoUrl_placeholder": "https://github.com/user/repo or git@github.com:user/repo.git",
    "settings.parsed": "📦 {{owner}}/{{repo}}",
    "settings.parseError": "⚠️ Unable to parse this URL",
    "settings.branch": "Branch",
    "settings.branch_desc": "Branch name for syncing",

    // ─── Settings: GitHub login ─────────────────────
    "settings.loggedIn": "✅ Logged in: {{username}}",
    "settings.loggedIn_default": "Connected",
    "settings.loggedIn_desc": "Token saved, plugin can access GitHub",
    "settings.logout": "Logout",
    "settings.step1": "Step 1: Create Token",
    "settings.step1_desc": "Click the button to open GitHub. Permissions are pre-filled, just confirm.",
    "settings.step1_btn": "Open GitHub to Create Token",
    "settings.step2": "Step 2: Paste Token",
    "settings.step2_desc": "Paste the token you just copied here",
    "settings.token_placeholder": "ghp_xxxx or github_pat_xxxx",
    "settings.verify": "Verify & Login",
    "settings.verifying": "Verifying...",
    "settings.pasteFirst": "Please paste the token first",
    "settings.loginSuccess": "✅ Login successful! User: {{username}}",
    "settings.loginFailed": "❌ Token invalid, please check",

    // ─── Settings: hints ────────────────────────────
    "settings.hint.noRepo": "💡 Please set the repository URL first",
    "settings.hint.noToken": "💡 Desktop can sync directly (uses system git credentials). Android requires GitHub login to sync.",

    // ─── Settings: support ──────────────────────────
    "settings.donate": "Donate",
    "settings.donate_desc": "If you like this plugin, consider donating to support continued development.",

    // ─── Settings: language ─────────────────────────
    "settings.language": "Language",
    "settings.language_desc": "Display language for the plugin (requires restart)",

    // ─── Commands ───────────────────────────────────
    "cmd.sync": "Sync",
    "cmd.pull": "Pull",
    "cmd.push": "Commit & Push",
    "cmd.status": "Show Sync Status",

    // ─── Ribbon ─────────────────────────────────────
    "ribbon.sync": "Moving Note: Sync",

    // ─── Notices: main.ts ───────────────────────────
    "notice.notConfigured": "Please configure the remote repository URL in settings first",
    "notice.syncing": "Syncing...",
    "notice.notConfiguredRepo": "Moving Note: Remote repository not configured",
    "notice.status_repo": "Repository: {{repo}}",
    "notice.status_branch": "Branch: {{branch}}",
    "notice.status_lastSync": "Last sync: {{sha}}",
    "notice.status_lastSync_never": "never",
    "notice.status_autoSync": "Auto-sync: every {{interval}} minutes",
    "notice.status_autoSync_disabled": "Auto-sync: disabled",

    // ─── Notices: sync-engine.ts ────────────────────
    "notice.gitInit": "Moving Note: Git repository initialized",
    "notice.firstSync": "Moving Note: First sync, downloading all files...",
    "notice.syncProgress": "Sync progress: {{current}}/{{total}}",

    // ─── Sync results ───────────────────────────────
    "sync.alreadySyncing": "Sync already in progress",
    "sync.failed": "Sync failed: {{msg}}",
    "sync.gitNotInit": "Git not initialized",
    "sync.conflict": "{{count}} file(s) have conflicts, see conflict-files-moving-note.md",
    "sync.committed": "Committed {{count}} file(s), but push failed: {{msg}}",
    "sync.synced": "Synced: committed and pushed {{count}} file(s)",
    "sync.upToDate": "Already up to date",
    "sync.noToken": "Please configure GitHub Token in settings",
    "sync.firstSyncDone": "First sync complete: downloaded {{count}} file(s)",
    "sync.pullOkPushFail": "Pulled {{pullCount}} file(s), but push failed: {{msg}}",
    "sync.pull": "Pulled {{count}}",
    "sync.push": "Pushed {{count}}",
    "sync.complete": "Sync complete: {{parts}} file(s)",
    "sync.pullDone": "Pull complete",
    "sync.pullNeedFirst": "Please perform a full sync first",
    "sync.pulled": "Pulled {{count}} file(s)",
    "sync.notConfigured": "Sync not configured",
    "sync.pullFailed": "Pull failed: {{msg}}",
    "sync.pushDone": "Push complete",
    "sync.noLocalChanges": "No local changes",
    "sync.pushComplete": "Push complete: {{count}} file(s)",
    "sync.pushFailed": "Push failed: {{msg}}",

    // ─── Conflict file ──────────────────────────────
    "conflict.heading": "# Conflict Files",
    "conflict.body": "The following files have conflicts. Please resolve them manually and sync again.",
    "conflict.instruction": "After resolving, use the `Moving Note: Sync` command to sync again.",
    "conflict.note": "> This file will be automatically deleted on the next commit",
};

export default en;
