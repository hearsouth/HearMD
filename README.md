# HearMD

一款轻量优雅的 Markdown 编辑器，基于 Tauri v2 + React 19 + Milkdown 构建。

## ✨ 特性

- **所见即所得** — 基于 Milkdown v7 (ProseMirror)，输入 Markdown 语法即时渲染
- **透明玻璃质感** — macOS 原生 NSVisualEffectView 毛玻璃效果，支持 3 套主题（浅色/深色/午夜）
- **多标签页** — 同时打开多个文件，标签页自由切换
- **侧边栏** — 文件树、大纲导航、最近文件，可拖拽调整宽度
- **代码缩略图** — 类 VS Code Minimap，支持点击/拖拽快速跳转
- **文件拖拽** — 直接拖拽 .md/.txt 文件到窗口打开
- **搜索替换** — 文件内搜索替换 (⌘F) + 全文件夹搜索 (⌘⇧F)，支持正则、大小写、全词匹配
- **数学公式** — LaTeX 行内公式 `$E=mc^2$` 和块级公式 `$$...$$`，KaTeX 渲染
- **GFM 扩展** — 表格、任务列表、删除线、脚注等 GitHub Flavored Markdown 语法
- **剪贴板 Markdown** — 粘贴 Markdown 文本自动解析为结构化内容
- **/ 命令菜单** — 输入 `/` 弹出格式选择框，支持搜索过滤和键盘导航
- **自动保存** — 已有文件 2 秒防抖自动保存
- **i18n** — 中英文界面切换
- **导出** — HTML 导出

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Tauri v2 + React 19 + TypeScript |
| 编辑器 | Milkdown v7 (commonmark + gfm + math) |
| 样式 | Tailwind CSS v4 (PostCSS) |
| 状态管理 | Zustand |
| 构建 | Vite |

## 🚀 开发

```bash
# 安装依赖
npm install

# 开发模式
cargo tauri dev

# 打包
cargo tauri build
```

## 📦 平台支持

| 平台 | 状态 |
|------|------|
| macOS | ✅ 支持（透明玻璃效果） |
| Windows | ✅ 支持 |
| Linux | ✅ 支持 |

## 📁 项目结构

```
src/
├── components/
│   ├── Editor/          # 编辑器核心（MilkdownEditor, Toolbar, StatusBar, TabBar, SearchPanel, Minimap）
│   ├── Sidebar/         # 侧边栏（文件树, 大纲）
│   └── Settings/        # 设置面板
├── stores/              # Zustand 状态管理
├── hooks/               # 自定义 Hooks（键盘快捷键, 自动保存）
└── index.css            # 设计系统（主题变量, 编辑器排版）
src-tauri/
├── src/lib.rs           # Rust 后端（窗口 vibrancy）
└── capabilities/        # Tauri 权限配置
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| ⌘S | 保存 |
| ⌘B | 切换侧边栏 |
| ⌘, | 打开设置 |
| ⌘F | 文件内搜索 |
| ⌘⇧F | 全文件夹搜索 |

## 📄 License

MIT
