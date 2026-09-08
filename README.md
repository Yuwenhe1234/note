# 东非大裂谷 · MemoAgent

> 一个采用五层 Agent 架构的智能任务备忘录。它不只是记录任务,更通过意图识别、任务拆解、时长估算、风险预警与记忆管理,把模糊目标转化为可执行、可跟踪的任务。

[![TypeScript](https://img.shields.io/badge/TypeScript-7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tauri](https://img.shields.io/badge/Tauri-2-ffc131?logo=tauri&logoColor=black)](https://tauri.app/)
[![Vitest](https://img.shields.io/badge/Vitest-✓-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## ✨ 核心特性

- **任务清单**:统计总任务 / 进行中 / 已完成,支持搜索、优先级、完成状态过滤与排序。
- **两阶段建任务**:先填基础信息,再触发 AI 分析,自动生成类型、优先级、子任务、时长、完成目标与提醒。
- **步骤管理**:子任务以 0.25 小时为刻度、可勾选完成气泡展示,支持双击改时长、拖动排序、增删步骤。
- **今日待办**:手动添加、浏览器语音识别(中文时间解析)、AI 一键生成、定时网页提醒（网页打开时）。
- **AI 分析**:接入 OpenAI 兼容接口,内置 OpenAI / DeepSeek / 通义千问 / 智谱 GLM / 自定义服务商,服务端严格校验返回结构并自动重试。
- **本地多账户**:离线账户登录、scrypt 密码哈希、HttpOnly 会话,每个账户独立的工作区与设置。
- **工作区持久化**:带乐观锁(revision)与自动备份,数据保存在本机。
- **桌面端**:Tauri 壳与原生置底桌面小组件(无边框、透明、跳过任务栏)。
- **可编辑文案**:站点名、Hero 标语 / 标题 / 说明、今日专注文案支持长按 / 双击就地编辑。

---

## 🧱 技术栈

| 层 | 技术 |
| --- | --- |
| 界面 | React 19 + TypeScript + Tailwind CSS |
| 构建 | Vite 8 |
| 动画 / 图标 | GSAP、lucide-react |
| 服务端 | Vite dev-server 中间件(Node.js,无独立后端进程) |
| 测试 | Vitest + Testing Library + jsdom |
| 桌面 | Tauri 2(Rust) |

> **运行环境**:Node.js `20.19+` 或 `22.12+`(Vite 8 要求),并安装 npm。

---

## 🏗️ 架构

项目沿用**五层 Agent 架构**作为设计理念,依赖方向自上而下:

```text
L1 交互接入层  →  React 界面与交互(src/L1-ui)
L2 Agent 核心  →  意图识别 / 插件编排 / 记忆(见下方说明)
L3 能力插件层  →  任务分析 / 学习辅助 / 风险建议 / 统计
L4 数据持久层  →  任务模型、仓库、工作区、备份(src/L4-data)
L5 基础能力层  →  日志 / 事件总线 / 存储 / 提醒(src/L5-services)
```

**当前实现状态**:

- ✅ 已迁移到 React + TypeScript:`L1-ui`、`L4-data`、`L5-services`。
- ✅ AI 分析、账户、工作区持久化通过 `server/` 目录的 Vite 中间件实现。
- ⏳ `L2-agent`(Agent 编排)与 `L3-plugins`(能力插件)仍保留在遗留的 `js/` 目录中,**尚未重新移植为 TypeScript 模块**;当前 React 应用由 `App.tsx` 直接编排任务流程,AI 分析通过 `/api/analyze-task` 路由完成。

> 完整的历史五层说明见 [`PROJECT.md`](./PROJECT.md)。⚠️ 其中"目录结构"章节已滞后于 React 迁移,以本 README 为准。

---

## 📁 目录结构

```text
note/
├─ index.html                 # React 挂载入口
├─ package.json               # 脚本与依赖
├─ vite.config.ts             # Vite + 中间件插件(认证 / 工作区 / AI)
├─ 启动项目.cmd                # Windows 一键启动脚本
├─ src/                       # 前端源码(React + TypeScript)
│  ├─ main.tsx                # 入口:会话门控,登录后渲染 App
│  ├─ App.tsx                 # 主应用(四大视图、任务流程、语音、小组件)
│  ├─ index.css               # 全局样式 / 设计令牌
│  ├─ L1-ui/
│  │  ├─ components/          # 通用组件
│  │  └─ features/            # auth / ai / settings / tasks
│  ├─ L4-data/                # task-model、仓库、backup-schema
│  └─ L5-services/            # reminder-service、todo-reminder-scheduler（网页提醒）
├─ server/                    # Vite 中间件(Node.js)
│  ├─ auth-routes.ts          # 账户 / 会话接口
│  ├─ auth-store.ts           # scrypt 密码哈希存储
│  ├─ workspace-routes.ts     # 工作区读写接口
│  ├─ workspace-store.ts      # 工作区持久化 + 版本 / 备份
│  ├─ ai-routes.ts            # AI 分析 / 今日待办 / 连接测试
│  ├─ ai-config.ts            # AI 配置存储
│  ├─ provider-registry.ts    # 服务商预设
│  └─ analysis-schema.ts      # AI 返回结构校验
├─ src-tauri/                 # Tauri 桌面壳
├─ docs/superpowers/          # 设计文档(specs)与实施计划(plans)
├─ ui框架/                    # UI 参考图
└─ js/                        # 遗留原生 JS(L2/L3 未迁移部分)
```

---

## 🚀 快速开始

### 方式一:一键启动(Windows)

双击 `启动项目.cmd`,脚本会自动检测 Node、安装依赖(首次)、挑选空闲端口并启动服务、打开浏览器。

### 方式二:手动命令

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器(默认 http://localhost:5173)
npm run dev

# 3. 构建生产版本
npm run build

# 4. 类型检查
npm run typecheck
```

启动后,首次使用会进入**账户选择 / 创建**页,输入任意账户名即可进入本地工作区。

---

## 🤖 配置 AI 分析

进入 **设置 → AI 与 API**,选择服务商并填写 API Key:

| 服务商 | 说明 |
| --- | --- |
| OpenAI | 默认 `gpt-4.1-mini` |
| DeepSeek | `deepseek-chat` / `deepseek-reasoner` |
| 通义千问 | `qwen-turbo` / `qwen-plus` / `qwen-max` |
| 智谱 GLM | `glm-4-flash` / `glm-4-plus` |
| 自定义兼容接口 | 任意兼容 OpenAI Chat Completions 的服务 |

配置后可点击 **测试当前连接** 验证。AI 分析会校验返回的 JSON 结构(步骤 2–8 个、单步 0.25–4 小时、`estimatedHours` 必须等于各步骤之和),格式不符时自动重试一次。

---

## 💾 数据与存储

| 数据 | 位置 |
| --- | --- |
| 账户(密码 scrypt 加盐哈希) | `.local/users.json` |
| 每用户工作区(任务 / 待办 / 设置 / 文案) | `.local/users/<userId>/workspace-data.json`(+ `.backup` 备份) |
| AI 配置(当前为全局共享) | `.local/ai-config.json` |
| 站点名、可编辑文案、今日待办等 | 浏览器 `localStorage`(`memo-agent-*` 键) |
| 今日消息订阅、摘要与去重指纹 | 浏览器 `localStorage`(`memo-agent-news-v1`) |

> `.local/`、`node_modules/`、`dist/` 等均已加入 `.gitignore`,不会提交到仓库。数据主要保存在本机,清理浏览器数据或删除 `.local/` 会丢失数据。

任务步骤使用 `{ id, title, hours, completed }` 结构,`hours` 最小 `0.25`、以 `0.25` 为刻度;旧备份中的 `durationMinutes`、`steps[].minutes` 与数字步骤数会在导入时自动迁移。

---

## 🧪 测试

```bash
# 交互式(watch 模式)
npm test

# 单次运行
npm test -- --run
```

覆盖范围包括:任务模型与迁移、备份格式、设置仓库、工作区存储、认证存储、提醒服务,以及 UI 组件 / 流程测试(Testing Library)。

---

## 🖥️ 桌面端(Tauri)

桌面壳位于 `src-tauri/`(Tauri 2,Rust)。开发模式:

```bash
npm run tauri dev      # 需要 Rust 工具链与 Tauri CLI
```

桌面小组件("其他功能 → 放入桌面")当前已有交互式预览,在第二阶段已接入原生置底、无边框、跳过任务栏的 Tauri 窗口。

“今日消息”“AI 陪伴”和“拓展功能”通过“其他功能”内的网站二级页面打开，保留主导航并可返回功能列表。今日消息仅在用户点击刷新时检查订阅后的新内容，复用“设置 → AI 与 API”的模型配置生成摘要，并自动清理保存满三天的消息。

今日待办的到点提醒在网页内以弹窗呈现，不依赖浏览器系统通知权限；网页关闭或设备休眠期间不保证触发。AI 陪伴后续可订阅同一提醒事件，当前不提供 AI 陪伴提醒。

动态平台来源必须填写具体账号、频道或 UP 主主页，平台根首页会被拒绝。点击来源旁的登录按钮会打开一次可见 Edge；刷新时自动切换为复用同一配置的后台 Edge，会读取 JavaScript 渲染后的真实作品链接，不会连续弹出内容页面。

---

## 🗺️ 路线图与已知限制

**进行中**

- 本地多账户与每用户数据隔离(账户 / 工作区已完成,AI 配置仍待按用户隔离)。
- 桌面小组件配置页与交互预览(已完成，含原生置底窗口)。
- 今日消息二级页面、订阅仓库、手动刷新、网页采集、AI 摘要与三天清理。
- AI 陪伴规划占位页与插件中心权限清单骨架。

**已知限制**

- 无后端服务、账号体系与多设备同步,数据仅存本机。
- 意图识别目前为规则式,非开放式语义理解。
- 学习辅助、风险分析、时长估算为本地规则能力。
- 搜索、文件解析、真实大模型对话尚未作为可复用 L5 服务接入。
- 抖音、小红书等登录后内容仍受平台验证和页面策略影响；当前采集器不会绕过验证码或安全机制。

---

## 📚 文档

- [`PROJECT.md`](./PROJECT.md) — 项目定位、视觉规范、交互逻辑与扩展约定(部分章节待同步)。
- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — 各功能设计文档。
- [`docs/superpowers/plans/`](./docs/superpowers/plans/) — 各功能实施计划。

---

## 📄 许可证

当前仓库未声明许可证;如需开放使用或贡献,请补充 `LICENSE` 文件并在 `package.json` / `Cargo.toml` 中声明。
