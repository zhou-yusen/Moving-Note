# Moving Note

<details open>
<summary><b>中文</b> | <a href="#">English</a></summary>

> 一个简洁的 Obsidian 同步插件：桌面端通过 Git 管理，移动端通过 GitHub API 同步。

Moving Note 是一款跨设备 Obsidian 笔记同步插件。桌面端利用系统 Git 实现自动 commit 和 push；安卓端通过 GitHub API 实现拉取和推送，无需本地 Git 环境。配置简单，一键同步，让你的笔记在多设备间保持一致。

## ✨ 特性

- **桌面端**：自动 commit & push 到 GitHub 远程仓库
- **安卓端**：通过 GitHub API 从远程拉取最新内容（只读）
- **一键同步**：拉取远程更新 → 提交本地更改 → 推送，一步完成
- **自动同步**：支持定时自动同步和启动时同步
- **冲突处理**：桌面端冲突生成提示文件，移动端以远程为准覆盖
- **灵活配置**：支持自定义仓库地址、分支名、提交消息模板

## 📦 安装

1. 下载 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 在 vault 的 `.obsidian/plugins/` 下创建 `moving-note` 文件夹
3. 将文件放入该文件夹
4. 在 Obsidian 设置 → 第三方插件中启用 **Moving Note**

## ⚙️ 配置

### 桌面端

1. 在设置中填写**远程仓库地址**（HTTPS 或 SSH 格式均可）
   ```
   https://github.com/用户名/仓库名
   git@github.com:用户名/仓库名.git
   ```
2. 设置**分支名**（默认 `main`）
3. 确保系统已安装 Git 并配置好凭据（SSH key 或 credential manager）

### 安卓端

1. 在设置中填写**远程仓库地址**
2. 点击「打开 GitHub 创建 Token」，权限已预填，直接确认即可
3. 复制 Token 粘贴到设置中，点击「验证并登录」
4. 设置**分支名**（需与桌面端推送的分支一致）

## 🔄 同步逻辑

### 桌面端（完整读写）

```
pull（拉取远程更新）
  ↓
commit（提交本地更改）
  ↓
push（推送到远程）
```

- 自动确保当前分支与设置一致
- 切换分支前自动暂存（stash）未提交的修改
- 远程仓库为空时跳过 pull，直接推送

### 安卓端（通过 API 读写）

- **首次同步**：从远程下载所有文件
- **后续同步**：检测本地变更 → 拉取远程更新 → 推送本地修改（通过 GitHub Git Data API）

## 📋 命令面板

| 命令 | 说明 |
|------|------|
| `Moving Note: 同步` | 完整同步（pull → commit → push） |
| `Moving Note: 拉取` | 仅拉取远程更新 |
| `Moving Note: 提交并推送` | 仅提交并推送本地更改 |
| `Moving Note: 显示同步状态` | 查看当前仓库和同步信息 |

侧边栏也有一个 🔄 同步按钮，点击即可快速同步。

## 📝 提交消息模板

支持以下占位符：

| 占位符 | 替换为 |
|--------|--------|
| `{{date}}` | 当前时间，格式 `2026-06-13 12:00:00` |
| `{{hostname}}` | 设置中的仓库拥有者名称 |

默认模板：`vault backup: {{date}}`

## ⚡ 自动同步

| 设置 | 说明 |
|------|------|
| 启动时同步 | Obsidian 启动时自动同步一次 |
| 自动同步间隔 | 定时同步（分钟），设为 0 禁用 |

## ❓ FAQ

**Q: 需要登录 GitHub 吗？**
A: 桌面端可选，移动端必须登录使用。

**Q: 安卓端可以推送吗？**
A: 可以。安卓端通过 GitHub API 支持拉取和推送。

**Q: 出现冲突怎么办？**
A: 桌面端会生成 `conflict-files-moving-note.md` 文件列出冲突文件，请手动解决后重新同步。

**Q: 可以用 GitLab / Gitea 等其他平台吗？**
A: 桌面端支持任何 Git 远程仓库。安卓端目前仅支持 GitHub API。

</details>

<details>
<summary><a href="#">中文</a> | <b>English</b></summary>

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

</details>

---

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
