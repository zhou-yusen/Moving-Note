# Moving Note

[中文](README_zh.md) | English

> A simple Obsidian sync plugin: Git on desktop, GitHub API on mobile. Full read-write support on both platforms.

Moving Note is a cross-device note sync plugin for Obsidian. On desktop, it leverages system Git for automatic commit and push. On Android, it uses the GitHub API for pulling and pushing changes — no local Git required. Simple to configure, one-click sync, keeping your notes consistent across devices.

## ✨ Features

- **Desktop**: Automatic commit & push to GitHub via system Git
- **Android**: Sync via GitHub API — pull remote changes and push local edits
- **One-click sync**: Pull → detect local changes → push, all in one step
- **Auto-sync**: Scheduled sync and sync-on-startup
- **Conflict handling**: Desktop generates conflict report files; mobile uses remote as source of truth
- **Flexible config**: Custom repo URL, branch name, commit message template

## 📦 Installation

1. Download `main.js`, `manifest.json`, and `styles.css`
2. Create a folder `moving-note` under `.obsidian/plugins/` in your vault
3. Place the files in that folder
4. Enable **Moving Note** in Obsidian Settings → Community Plugins

## ⚙️ Configuration

### Desktop

1. Enter the **Repository URL** in settings (HTTPS or SSH)
   ```
   https://github.com/user/repo
   git@github.com:user/repo.git
   ```
2. Set the **Branch name** (default: `main`)
3. Ensure Git is installed and credentials are configured (SSH key or credential manager)

### Android

1. Enter the **Repository URL** in settings
2. Click "Open GitHub to Create Token" — permissions are pre-filled, just confirm
3. Paste the token and click "Verify & Login"
4. Set the **Branch name** (must match the branch used on desktop)

## 🔄 Sync Logic

### Desktop (full read/write)

```
Pull remote changes
  ↓
Commit local changes
  ↓
Push to remote
```

- Automatically ensures the current branch matches settings
- Stashes uncommitted changes before switching branches
- Skips pull if remote branch doesn't exist (e.g., first push)

### Android (read + write via API)

- **First sync**: Downloads all files from remote
- **Subsequent syncs**: Detects local changes → pulls remote updates → pushes local edits via GitHub Git Data API

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Moving Note: Sync` | Full sync (pull → detect changes → push) |
| `Moving Note: Pull` | Pull remote updates only |
| `Moving Note: Commit & Push` | Commit and push local changes only |
| `Moving Note: Show Sync Status` | View current repo and sync info |

There's also a sync button in the sidebar ribbon for quick access.

## 📝 Commit Message Template

Available placeholders:

| Placeholder | Replaced with |
|-------------|---------------|
| `{{date}}` | Current time, format: `2026-06-13 12:00:00` |
| `{{hostname}}` | Repository owner name from settings |

Default template: `vault backup: {{date}}`

## ⚡ Auto-sync

| Setting | Description |
|---------|-------------|
| Sync on startup | Automatically sync once when Obsidian starts |
| Auto-sync interval | Scheduled sync (minutes), set to 0 to disable |

## ❓ FAQ

**Q: Do I need to log in to GitHub?**
A: Optional on desktop, required on mobile.

**Q: Can Android push changes?**
A: Yes. Android supports both pull and push via GitHub API.

**Q: What about conflicts?**
A: On desktop, a `conflict-files-moving-note.md` file is generated listing conflicting files. Resolve them manually and sync again.

**Q: Can I use GitLab / Gitea?**
A: Desktop supports any Git remote. Android currently only supports GitHub API.

## 🛠️ Development

```bash
npm install
npm run dev
npm run build
```

## 🙏 Acknowledgments

- [obsidian-git](https://github.com/Vinzent03/obsidian-git) — The inspiration behind this plugin.

## 📄 License

[MIT](LICENSE)
