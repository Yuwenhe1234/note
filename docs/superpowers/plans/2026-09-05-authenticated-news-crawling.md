# Authenticated News Crawling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用本机持久化 Edge 会话抓取账号主页中真实发布的视频或文章，并禁止平台官网被保存为消息。

**Architecture:** `server/news-browser.ts` 管理 Playwright Core 的 Edge 持久化上下文；平台适配器通过注入的动态 HTML 加载器读取渲染后的作品列表和内容页。React 通过 `/api/news/login` 打开官方登录页，通过 `/api/news/refresh` 获取只包含真实内容链接的完整 AI 卡片。

**Tech Stack:** TypeScript、Playwright Core、Microsoft Edge、Vite middleware、Vitest。

---

### Task 1: Subscription URL validation

**Files:** `src/L4-data/news-model.ts`, `src/L4-data/news-model.test.ts`, `src/L1-ui/features/news/news-window.tsx`

- [ ] Add failing tests rejecting platform root homepages and accepting concrete account/channel URLs.
- [ ] Run the focused test and confirm failure is caused by missing validation.
- [ ] Implement `validateNewsSourceUrl` and show its precise error in the add-source form.
- [ ] Re-run focused tests and require all pass.

### Task 2: Persistent Edge browser session

**Files:** `server/news-browser.ts`, `server/news-browser.test.ts`, `server/news-routes.ts`, `package.json`, `package-lock.json`

- [ ] Install `playwright-core` without downloading a bundled browser.
- [ ] Add failing tests for persistent profile selection, login navigation, rendered HTML retrieval, and browser-unavailable errors using an injected launcher.
- [ ] Implement one lazily created Edge persistent context under `.local/news-browser/<user>` and close it when the Vite server stops.
- [ ] Add `/api/news/login` with an allowlisted platform URL and return a clear success/error result.

### Task 3: Real post discovery and no homepage fallback

**Files:** `server/news-adapters.ts`, `server/news-adapters.test.ts`, `server/news-routes.ts`

- [ ] Add failing tests proving platform source pages use rendered HTML and produce only post URLs.
- [ ] Add a failing test proving zero discovered posts returns an error instead of the source homepage.
- [ ] Inject the Edge page loader into platform collection while keeping ordinary websites on lightweight HTTP.
- [ ] Fetch each discovered content page through the authenticated Edge context and preserve its canonical URL.

### Task 4: Login interaction and end-to-end verification

**Files:** `src/L1-ui/features/news/news-client.ts`, `src/L1-ui/features/news/news-window.tsx`, `src/L1-ui/features/news/news-window.test.tsx`

- [ ] Add failing UI tests for opening official login through the local API and displaying login/browser errors.
- [ ] Implement login requests and status feedback; never expose cookies to React.
- [ ] Run all tests, typecheck, and production build.
- [ ] Start Vite, verify platform-homepage rejection and `/api/news/refresh` route behavior with real HTTP requests.
