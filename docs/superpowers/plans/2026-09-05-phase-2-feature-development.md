# 第二阶段功能开发 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持主导航和交互风格不变的前提下，交付网站内二级页面形式的今日消息、AI 陪伴占位页和插件中心骨架，其中今日消息具备订阅、手动增量刷新、AI 总结、原链接跳转及三天清理能力。

**Architecture:** React 主应用使用“其他功能”的内部二级页面状态渲染今日消息、AI 陪伴和插件中心，并提供统一返回操作。今日消息前端使用独立仓库保存来源与消息，Vite 本地服务通过平台适配器抓取和标准化内容并复用现有 AI 配置总结；插件中心使用受控清单与权限声明模型。

**Tech Stack:** React、TypeScript、Vitest、Testing Library、Vite middleware。

---

### Task 1: 今日消息领域模型与本地仓库

**Files:**
- Create: `src/L4-data/news-model.ts`
- Create: `src/L4-data/news-model.test.ts`
- Create: `src/L4-data/news-repository.ts`
- Create: `src/L4-data/news-repository.test.ts`

- [ ] **Step 1: Write failing model tests** covering platform detection, URL normalization, duplicate keys, subscription-time filtering, and three-day expiry.
- [ ] **Step 2: Run `npm test -- --run src/L4-data/news-model.test.ts`** and verify failures are caused by missing exports.
- [ ] **Step 3: Implement typed `NewsSource`, `NewsItem`, `RefreshSummary`, `detectPlatform`, `normalizeContentUrl`, `isPublishedAfterSubscription`, and `isExpiredNewsItem`.**
- [ ] **Step 4: Run the model tests** and verify they pass.
- [ ] **Step 5: Write failing repository tests** for add/remove source, merge-and-deduplicate items, retention cleanup, and preservation of source cursors.
- [ ] **Step 6: Implement a storage-injected repository** so production uses `localStorage` while tests use an in-memory `Storage` implementation.
- [ ] **Step 7: Run both model and repository tests** and verify they pass.

### Task 2: 采集适配器、内容解析与 AI 总结接口

**Files:**
- Create: `server/news-types.ts`
- Create: `server/news-adapters.ts`
- Create: `server/news-adapters.test.ts`
- Create: `server/news-service.ts`
- Create: `server/news-service.test.ts`
- Create: `server/news-routes.ts`
- Modify: `server/ai-config.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Write failing adapter tests** using saved HTML fixtures for B站、YouTube、抖音、小红书 and ordinary Open Graph pages.
- [ ] **Step 2: Run adapter tests** and verify the platform adapters are missing.
- [ ] **Step 3: Implement adapter selection and HTML metadata extraction** into one `NormalizedContent` contract; reject unsupported protocols and private/local network targets.
- [ ] **Step 4: Run adapter tests** and verify they pass.
- [ ] **Step 5: Write failing service tests** for subscription boundary filtering, ID/link deduplication, isolated source failures, AI retry, and cursor advancement only after source success.
- [ ] **Step 6: Implement `refreshNewsSources` with injected fetcher and summarizer**, bounded concurrency, per-source errors, and complete-card-only output.
- [ ] **Step 7: Add `/api/news/refresh` and `/api/news/preview-source` middleware routes** and reuse the existing AI configuration store through an exported accessor.
- [ ] **Step 8: Run server tests** and verify all pass.

### Task 3: 今日消息界面（已由 Revision Task 8 修正为网站内二级页面）

**Files:**
- Create: `src/L1-ui/features/news/news-window.tsx`
- Create: `src/L1-ui/features/news/news-window.test.tsx`
- Create: `src/L1-ui/features/news/news-client.ts`
- Create: `src/L5-services/feature-windows.ts`
- Create: `src/L5-services/feature-windows.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing window-service tests** for browser fallback and Tauri invocation.
- [ ] **Step 2: Implement `openFeatureWindow`** with stable labels for news, companion, and plugins.
- [ ] **Step 3: Write failing UI tests** for add source, empty initial history, refresh loading state, complete message card, source error, delete source, and external-link action.
- [ ] **Step 4: Implement the news client and `NewsWindow`** with source sidebar, refresh summary, three-day cleanup on load, and cards rendered only after summaries are available.
- [ ] **Step 5: Add query-parameter root routing in `main.tsx`** so `?window=news` renders the independent news root.
- [ ] **Step 6: Add scoped styles** using existing colors, typography, rounded cards, buttons, and reduced-motion behavior.
- [ ] **Step 7: Run news and window-service tests** and verify they pass.

### Task 4: 原 Tauri 功能窗口方案（已由 Revision Task 8 废弃，仅保留平台官方登录）

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`
- Create: `src/L5-services/platform-login.ts`
- Create: `src/L5-services/platform-login.test.ts`

- [ ] **Step 1: Write failing frontend tests** for opening a platform login URL through an allowlisted Tauri command and browser fallback.
- [ ] **Step 2: Implement frontend login service** without accepting or storing passwords.
- [ ] **Step 3: Add Rust commands** to create/focus feature windows and platform official-login windows with fixed labels and allowlisted HTTPS hosts.
- [ ] **Step 4: Register commands and required capabilities.**
- [ ] **Step 5: Run frontend tests and `cargo check --manifest-path src-tauri/Cargo.toml`.**

### Task 5: AI 陪伴占位页和插件中心骨架

**Files:**
- Create: `src/L1-ui/features/companion/companion-window.tsx`
- Create: `src/L1-ui/features/companion/companion-window.test.tsx`
- Create: `src/L3-plugins/plugin-manifest.ts`
- Create: `src/L3-plugins/plugin-manifest.test.ts`
- Create: `src/L1-ui/features/plugins/plugin-center-window.tsx`
- Create: `src/L1-ui/features/plugins/plugin-center-window.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing tests** for the companion privacy/scope copy and plugin permission validation.
- [ ] **Step 2: Implement the companion placeholder** without upload or training controls.
- [ ] **Step 3: Implement plugin manifest validation and local enable/disable state** with explicit permission labels.
- [ ] **Step 4: Implement plugin center empty state and manifest cards.**
- [ ] **Step 5: Route `?window=companion` and `?window=plugins` to their independent roots.**
- [ ] **Step 6: Run companion and plugin tests.**

### Task 6: Connect existing feature cards without changing the main layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing App tests** proving 今日消息、AI 陪伴 and 拓展功能 cards are enabled and call the independent-window service, while the main view remains on 其他功能.
- [ ] **Step 2: Inject feature-card actions** that open the three windows and leave all existing layout markup intact.
- [ ] **Step 3: Run `npm test -- --run src/App.test.tsx`.**

### Task 7: Documentation and full verification

**Files:**
- Modify: `PROJECT.md`
- Modify: `README.md`

- [ ] **Step 1: Update project documentation** with independent-window routing, news storage rules, adapter boundary, manual refresh semantics, and plugin center status.
- [ ] **Step 2: Run `npm test -- --run`** and require zero failing tests.
- [ ] **Step 3: Run `npm run typecheck`** and require exit code 0.
- [ ] **Step 4: Run `npm run build`** and require exit code 0.
- [ ] **Step 5: Run `cargo check --manifest-path src-tauri/Cargo.toml`** and require exit code 0.
- [ ] **Step 6: Inspect `git diff --check` and the scoped diff**, confirming no unrelated WorkBuddy changes were overwritten.

### Revision Task 8: Replace native windows with website secondary pages

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/L1-ui/features/news/news-window.tsx`
- Modify: `src/L1-ui/features/companion/companion-window.tsx`
- Modify: `src/L1-ui/features/plugins/plugin-center-window.tsx`
- Modify: `src/main.tsx`
- Delete: `src/L5-services/feature-windows.ts`
- Delete: `src/L5-services/feature-windows.test.ts`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Write a failing App test** that clicks each capability card, verifies the matching heading appears inside the existing app, verifies “返回其他功能” restores the card grid, and verifies `window.open` is not called.
- [ ] **Step 2: Run `npm test -- --run src/App.test.tsx -t "website secondary pages"`** and verify the test fails because the current implementation still delegates to the Tauri window service.
- [ ] **Step 3: Add `featurePage` state to `App`** and render `NewsWindow`, `CompanionWindow`, or `PluginCenterWindow` inside the existing “其他功能” content branch with an `onBack` callback.
- [ ] **Step 4: Add a shared back control to each feature component** and keep the existing visual tokens and page structure.
- [ ] **Step 5: Remove query-parameter feature roots, native-window service files, and the Tauri webview permissions and labels** because desktop placement is explicitly deferred.
- [ ] **Step 6: Run the focused App test** and verify it passes.
- [ ] **Step 7: Run full tests, typecheck, and production build** and require zero failures.
