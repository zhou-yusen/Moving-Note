const zh: Record<string, string> = {
    // ─── 设置：标题 ─────────────────────────────────
    "settings.heading.sync": "同步",
    "settings.heading.syncSettings": "同步设置",
    "settings.heading.remote": "远程仓库",
    "settings.heading.github": "GitHub 登录",
    "settings.heading.support": "支持作者",

    // ─── 设置：同步部分 ─────────────────────────────
    "settings.syncDocs": "同步文档",
    "settings.syncDocs_desc": "点击按钮实现文档的同步",
    "settings.lastSync": "上次同步：commit {{sha}}",

    // ─── 设置：同步设置 ─────────────────────────────
    "settings.autoSyncInterval": "自动同步间隔（分钟）",
    "settings.autoSyncInterval_desc": "设为 0 禁用自动同步",
    "settings.syncOnStartup": "启动时同步",
    "settings.syncOnStartup_desc": "Obsidian 启动时自动同步一次",
    "settings.commitMsg": "提交消息模板",
    "settings.commitMsg_desc": "可用占位符：{{date}}, {{hostname}}",
    "settings.commitMsg_placeholder": "vault backup: {{date}}",

    // ─── 设置：远程仓库 ─────────────────────────────
    "settings.repoUrl": "仓库地址",
    "settings.repoUrl_desc": "GitHub 仓库的完整 URL（支持 HTTPS 和 SSH 格式）",
    "settings.repoUrl_placeholder": "https://github.com/用户名/仓库名 或 git@github.com:用户名/仓库名.git",
    "settings.parsed": "📦 {{owner}}/{{repo}}",
    "settings.parseError": "⚠️ 无法解析此地址",
    "settings.branch": "分支",
    "settings.branch_desc": "同步的分支名",

    // ─── 设置：GitHub 登录 ──────────────────────────
    "settings.loggedIn": "✅ 已登录：{{username}}",
    "settings.loggedIn_default": "已连接",
    "settings.loggedIn_desc": "Token 已保存，插件可正常访问 GitHub",
    "settings.logout": "退出登录",
    "settings.step1": "第一步：创建 Token",
    "settings.step1_desc": "点击按钮会打开 GitHub 页面，权限已预填好，直接点确认即可",
    "settings.step1_btn": "打开 GitHub 创建 Token",
    "settings.step2": "第二步：粘贴 Token",
    "settings.step2_desc": "把刚才复制的 Token 粘贴到这里",
    "settings.token_placeholder": "ghp_xxxx 或 github_pat_xxxx",
    "settings.verify": "验证并登录",
    "settings.verifying": "验证中...",
    "settings.pasteFirst": "请先粘贴 Token",
    "settings.loginSuccess": "✅ 登录成功！用户：{{username}}",
    "settings.loginFailed": "❌ Token 无效，请检查",

    // ─── 设置：提示 ─────────────────────────────────
    "settings.hint.noRepo": "💡 请先填写仓库地址",
    "settings.hint.noToken": "💡 桌面端可直接使用（依赖系统 git 凭据）。安卓端需要登录 GitHub 才能同步。",

    // ─── 设置：支持作者 ─────────────────────────────
    "settings.donate": "捐赠",
    "settings.donate_desc": "如果您喜欢此插件，请考虑捐赠以支持持续开发。",

    // ─── 设置：语言 ─────────────────────────────────
    "settings.language": "语言",
    "settings.language_desc": "插件显示语言（需重启生效）",

    // ─── 命令 ───────────────────────────────────────
    "cmd.sync": "同步",
    "cmd.pull": "拉取",
    "cmd.push": "提交并推送",
    "cmd.status": "显示同步状态",

    // ─── 侧边栏 ─────────────────────────────────────
    "ribbon.sync": "Moving Note: 同步",

    // ─── 通知：main.ts ──────────────────────────────
    "notice.notConfigured": "请先在设置中配置远程仓库地址",
    "notice.syncing": "正在同步...",
    "notice.notConfiguredRepo": "Moving Note: 未配置远程仓库",
    "notice.status_repo": "仓库: {{repo}}",
    "notice.status_branch": "分支: {{branch}}",
    "notice.status_lastSync": "上次同步: {{sha}}",
    "notice.status_lastSync_never": "从未",
    "notice.status_autoSync": "自动同步: 每 {{interval}} 分钟",
    "notice.status_autoSync_disabled": "自动同步: 禁用",

    // ─── 通知：sync-engine.ts ───────────────────────
    "notice.gitInit": "Moving Note: 已初始化 Git 仓库",
    "notice.firstSync": "Moving Note: 首次同步，正在下载所有文件...",
    "notice.syncProgress": "同步进度: {{current}}/{{total}}",

    // ─── 同步结果 ───────────────────────────────────
    "sync.alreadySyncing": "同步已在进行中",
    "sync.failed": "同步失败: {{msg}}",
    "sync.gitNotInit": "Git 未初始化",
    "sync.conflict": "有 {{count}} 个文件冲突，请查看 conflict-files-moving-note.md",
    "sync.committed": "已提交 {{count}} 个文件，但推送失败: {{msg}}",
    "sync.synced": "已同步：提交并推送 {{count}} 个文件",
    "sync.upToDate": "已是最新",
    "sync.noToken": "请先在设置中配置 GitHub Token",
    "sync.firstSyncDone": "首次同步完成：下载了 {{count}} 个文件",
    "sync.pullOkPushFail": "拉取了 {{pullCount}} 个文件，但推送失败: {{msg}}",
    "sync.pull": "拉取 {{count}} 个",
    "sync.push": "推送 {{count}} 个",
    "sync.complete": "同步完成：{{parts}} 文件",
    "sync.pullDone": "拉取完成",
    "sync.pullNeedFirst": "请先执行一次完整同步",
    "sync.pulled": "拉取了 {{count}} 个文件",
    "sync.notConfigured": "未配置同步",
    "sync.pullFailed": "拉取失败: {{msg}}",
    "sync.pushDone": "推送完成",
    "sync.noLocalChanges": "没有本地变更",
    "sync.pushComplete": "推送完成：{{count}} 个文件",
    "sync.pushFailed": "推送失败: {{msg}}",

    // ─── 冲突文件 ───────────────────────────────────
    "conflict.heading": "# 冲突文件",
    "conflict.body": "以下文件存在冲突，请手动解决后重新同步。",
    "conflict.instruction": "解决后使用 `Moving Note: 同步` 命令重新同步。",
    "conflict.note": "> 此文件会在下次提交时自动删除",
};

export default zh;
