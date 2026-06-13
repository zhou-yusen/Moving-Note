# Moving Note

> 一个简洁的 Obsidian 同步插件：桌面端通过 Git 管理，移动端通过 GitHub API 同步。

中文 | [English](README_en.md)

Moving Note 是一款跨设备 Obsidian 笔记同步插件。桌面端利用系统 Git 实现自动 commit 和 push；安卓端通过 GitHub API 实现拉取和推送，无需本地 Git 环境。配置简单，一键同步，让你的笔记在多设备间保持一致。

## ✨ 特性

- **桌面端**：自动 commit & push 到 GitHub 远程仓库
- **安卓端**：通过 GitHub API 从远程拉取最新内容（只读）
- **一键同步**：拉取远程更新 → 提交本地更改 → 推送，一步完成
- **自动同步**：支持定时自动同步和启动时同步
- **冲突处理**：桌面端冲突生成提示文件，移动端以远程为准覆盖
- **灵活配置**：支持自定义仓库地址、分支名、提交消息模板

## 📦 安装

### 从 GitHub 下载（推荐）

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

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build
```

构建产物在 `output/` 目录下。

## 🙏 致谢

- [obsidian-git](https://github.com/Vinzent03/obsidian-git) — 本插件的灵感来源。obsidian-git 是 Obsidian 社区中最受欢迎的 Git 同步插件，本项目在开发过程中大量参考了它的架构设计和实现思路。

## 📄 许可证

[MIT](LICENSE)
