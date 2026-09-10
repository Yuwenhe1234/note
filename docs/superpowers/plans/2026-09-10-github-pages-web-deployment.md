# GitHub Pages Web Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a no-login, browser-persistent MemoAgent on GitHub Pages while preserving the current Tauri desktop behavior and replacing web news scraping with manual AI-assisted message entry.

**Architecture:** Add one runtime-capability boundary that selects browser or desktop behavior. Browser mode stores the workspace and user-owned AI credentials in `localStorage`, calls compatible AI providers directly, and exposes manual news ingestion; desktop mode keeps the existing Vite middleware, authentication, Playwright collection, and Tauri APIs. A GitHub Actions workflow builds with the `/note/` base path and deploys only after checks pass.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest, Testing Library, Tauri 2, GitHub Actions, GitHub Pages.

---

## File map

- Create `src/L5-services/runtime-capabilities.ts`: single source of truth for GitHub Pages, browser, and Tauri capabilities.
- Create `src/L5-services/runtime-capabilities.test.ts`: capability matrix tests.
- Modify `src/L4-data/workspace-repository.ts`: select API-backed desktop storage or versioned browser storage.
- Modify `src/L4-data/workspace-repository.test.ts`: browser persistence, revisions, corruption, and quota tests.
- Modify `src/main.tsx` and `src/App.test.tsx`: bypass local authentication in static web mode.
- Create `src/L5-services/browser-ai-client.ts`: local AI configuration, direct Chat Completions requests, error mapping, and schema validation.
- Create `src/L5-services/browser-ai-client.test.ts`: AI storage, request, and error tests.
- Modify `src/L1-ui/features/ai/ai-settings.tsx` and its test: use the browser AI client in web mode and retain desktop routes otherwise.
- Modify `src/L1-ui/features/tasks/analyze-task.ts`, `src/App.tsx`, and focused tests: route web AI actions through the browser client.
- Modify `src/L4-data/news-model.ts` and `src/L4-data/news-repository.ts`: define and save manually entered messages.
- Create `src/L1-ui/features/news/manual-news-dialog.tsx` and test: collect source, URL, title, and body and optionally summarize.
- Modify `src/L1-ui/features/news/news-window.tsx` and its test: use manual ingestion on web and preserve desktop refresh/login controls.
- Modify `src/L5-services/widget-window.ts`, desktop configuration UI, and tests: prevent web calls to desktop APIs and show a desktop-only explanation.
- Modify `src/L4-data/backup-schema.ts` and tests: include the complete browser workspace and news state in portable backups.
- Modify `vite.config.ts` and `package.json`: add the GitHub Pages build mode and `/note/` base path.
- Create `.github/workflows/deploy-pages.yml`: verify and publish `dist/` from `main`.
- Modify `README.md`: document web/desktop differences, privacy, AI CORS, Pages setup, and release flow.

### Task 1: Add a runtime capability boundary

**Files:**
- Create: `src/L5-services/runtime-capabilities.ts`
- Create: `src/L5-services/runtime-capabilities.test.ts`

- [ ] **Step 1: Write the failing capability tests**

```ts
import { describe, expect, it } from "vitest";
import { capabilitiesFor } from "./runtime-capabilities";

describe("runtime capabilities", () => {
  it("disables server and native actions for the static web build", () => {
    expect(capabilitiesFor({ staticWeb: true, tauri: false })).toEqual({
      staticWeb: true,
      localAuth: false,
      serverWorkspace: false,
      serverAi: false,
      automaticNews: false,
      desktopWidget: false,
    });
  });

  it("keeps current desktop development capabilities", () => {
    expect(capabilitiesFor({ staticWeb: false, tauri: true })).toMatchObject({
      localAuth: true,
      serverWorkspace: true,
      serverAi: true,
      automaticNews: true,
      desktopWidget: true,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --run src/L5-services/runtime-capabilities.test.ts`

Expected: FAIL because `runtime-capabilities.ts` does not exist.

- [ ] **Step 3: Implement the capability matrix**

```ts
import { isTauri } from "@tauri-apps/api/core";

export type RuntimeCapabilities = {
  staticWeb: boolean;
  localAuth: boolean;
  serverWorkspace: boolean;
  serverAi: boolean;
  automaticNews: boolean;
  desktopWidget: boolean;
};

export function capabilitiesFor(input: { staticWeb: boolean; tauri: boolean }): RuntimeCapabilities {
  if (input.staticWeb) return {
    staticWeb: true,
    localAuth: false,
    serverWorkspace: false,
    serverAi: false,
    automaticNews: false,
    desktopWidget: false,
  };
  return {
    staticWeb: false,
    localAuth: true,
    serverWorkspace: true,
    serverAi: true,
    automaticNews: true,
    desktopWidget: input.tauri,
  };
}

export const runtimeCapabilities = capabilitiesFor({
  staticWeb: import.meta.env.MODE === "github-pages",
  tauri: isTauri(),
});
```

- [ ] **Step 4: Run the test and typecheck**

Run: `npm test -- --run src/L5-services/runtime-capabilities.test.ts && npm run typecheck`

Expected: PASS and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/L5-services/runtime-capabilities.ts src/L5-services/runtime-capabilities.test.ts
git commit -m "feat: define web and desktop capabilities"
```

### Task 2: Persist the static web workspace in the browser

**Files:**
- Modify: `src/L4-data/workspace-repository.ts`
- Modify: `src/L4-data/workspace-repository.test.ts`

- [ ] **Step 1: Add failing browser repository tests**

Add tests that inject a `Storage` instance and `{ serverWorkspace: false }`, then assert:

```ts
const first = await loadWorkspace({ storage: localStorage, serverWorkspace: false });
expect(first).toBeNull();

const saved = await saveWorkspace(workspace, { storage: localStorage, serverWorkspace: false });
expect(saved.revision).toBe(workspace.revision + 1);
expect((await loadWorkspace({ storage: localStorage, serverWorkspace: false }))?.tasks).toEqual(workspace.tasks);
```

Also seed invalid JSON and assert `loadWorkspace` rejects with `浏览器工作区数据已损坏`; mock `setItem` throwing `QuotaExceededError` and assert `saveWorkspace` rejects with `浏览器存储空间不足，工作区未保存`.

- [ ] **Step 2: Verify the focused tests fail**

Run: `npm test -- --run src/L4-data/workspace-repository.test.ts`

Expected: FAIL because repository functions do not accept runtime options.

- [ ] **Step 3: Implement the browser adapter without changing the server contract**

Add:

```ts
import { runtimeCapabilities } from "../L5-services/runtime-capabilities";

const WEB_WORKSPACE_KEY = "memo-agent-workspace-v1";
type WorkspaceOptions = { storage?: Storage; serverWorkspace?: boolean };

function options(value: WorkspaceOptions = {}) {
  return {
    storage: value.storage ?? localStorage,
    serverWorkspace: value.serverWorkspace ?? runtimeCapabilities.serverWorkspace,
  };
}
```

Update `loadWorkspace(value = {})` to use the existing `/api/workspace` request when `serverWorkspace` is true. Otherwise parse `WEB_WORKSPACE_KEY`, return `null` when absent, require `version === 1`, and throw the corruption error for invalid data.

Update `saveWorkspace(data, value = {})` to preserve the existing API branch. The browser branch clones `data`, increments `revision`, sets `updatedAt` to a new ISO timestamp, writes it atomically with one `setItem`, maps quota exceptions to the specified message, and returns the saved value.

- [ ] **Step 4: Run repository and application tests**

Run: `npm test -- --run src/L4-data/workspace-repository.test.ts src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/L4-data/workspace-repository.ts src/L4-data/workspace-repository.test.ts
git commit -m "feat: persist web workspace locally"
```

### Task 3: Bypass local authentication in the static web build

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add a failing root selection test**

Extract and export `Root` from `src/main.tsx`. Mock `runtimeCapabilities.staticWeb` as true, render `<Root />`, and assert that the application heading appears while `/api/auth/session` is never fetched and `LoginScreen` is absent.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because `Root` always starts the authentication request.

- [ ] **Step 3: Implement the static web branch**

At the beginning of `Root`, after widget detection, render `<App />` when `runtimeCapabilities.staticWeb` is true. Do not create a synthetic account and do not read `memo-agent-last-account`. Leave the current desktop session and logout flow unchanged.

```tsx
if (isWidget) return <WidgetWindowRoot />;
if (runtimeCapabilities.staticWeb) return <App />;
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --run src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.test.tsx
git commit -m "feat: open web app without local login"
```

### Task 4: Add the user-owned browser AI client

**Files:**
- Create: `src/L5-services/browser-ai-client.ts`
- Create: `src/L5-services/browser-ai-client.test.ts`
- Reuse: `server/analysis-schema.ts`

- [ ] **Step 1: Write failing configuration and request tests**

Test these public functions:

```ts
saveBrowserAiConfig({ provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", apiKey: "secret", enabled: true }, localStorage);
expect(loadBrowserAiConfig(localStorage).apiKey).toBe("secret");

await chatCompletion([{ role: "user", content: "hello" }], { storage: localStorage, fetcher });
expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
```

Cover missing configuration, HTTP 401, HTTP 429, a rejected fetch, invalid JSON, and invalid task-analysis schema. Expected messages are respectively `请先配置 AI 服务`, `API Key 无效或无权访问`, `AI 服务请求过于频繁`, `无法连接 AI 服务；该服务商可能不允许浏览器跨域访问`, `AI 服务返回了无效数据`, and the existing analysis-schema validation message.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run src/L5-services/browser-ai-client.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement storage, endpoint normalization, and error mapping**

Export:

```ts
export type BrowserAiConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
};
export const BROWSER_AI_CONFIG_KEY = "memo-agent-ai-config-v1";
export function loadBrowserAiConfig(storage: Storage = localStorage): BrowserAiConfig;
export function saveBrowserAiConfig(config: BrowserAiConfig, storage: Storage = localStorage): void;
export async function chatCompletion(messages: { role: "system" | "user"; content: string }[], options?: { storage?: Storage; fetcher?: typeof fetch; temperature?: number }): Promise<string>;
export async function testBrowserAiConnection(options?: { storage?: Storage; fetcher?: typeof fetch }): Promise<void>;
export async function analyzeTaskInBrowser(input: AnalyzeTaskInput): Promise<TaskAnalysis>;
export async function generateTodayInBrowser(tasks: Task[]): Promise<string[]>;
export async function summarizeNewsInBrowser(input: ManualNewsInput): Promise<NewsSummary>;
```

Normalize `baseUrl` by removing trailing slashes and appending `/chat/completions`. Send `Authorization: Bearer <apiKey>` and `{ model, messages, temperature }`. Parse the first choice message content, strip an optional fenced JSON wrapper, and validate task analysis with the same invariants currently enforced by `server/analysis-schema.ts`.

- [ ] **Step 4: Run the focused tests and typecheck**

Run: `npm test -- --run src/L5-services/browser-ai-client.test.ts server/analysis-schema.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/L5-services/browser-ai-client.ts src/L5-services/browser-ai-client.test.ts server/analysis-schema.ts
git commit -m "feat: add browser ai client"
```

### Task 5: Connect settings and task actions to browser AI

**Files:**
- Modify: `src/L1-ui/features/ai/ai-settings.tsx`
- Modify: `src/L1-ui/features/ai/ai-settings.test.tsx`
- Modify: `src/L1-ui/features/tasks/analyze-task.ts`
- Modify: `src/L1-ui/features/tasks/analysis-step-editor.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing web-mode UI tests**

Mock `runtimeCapabilities.serverAi` as false. Assert settings load/save the full browser configuration without fetching `/api/ai/config`, connection testing uses `testBrowserAiConnection`, task analysis uses `analyzeTaskInBrowser`, and “AI 一键生成” uses `generateTodayInBrowser`.

Assert the settings page contains: `API Key 仅保存在当前浏览器。请只在可信设备上使用。`

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run src/L1-ui/features/ai/ai-settings.test.tsx src/L1-ui/features/tasks/analysis-step-editor.test.tsx src/App.test.tsx`

Expected: FAIL because all three flows call `/api/*`.

- [ ] **Step 3: Implement capability-selected AI calls**

In `AiSettings`, initialize from `loadBrowserAiConfig` when `serverAi` is false; save with `saveBrowserAiConfig`; test with `testBrowserAiConnection`. Keep the current fetch branches unchanged for desktop mode. In browser mode, retain the Key in storage but continue rendering it as a password input.

In `analyze-task.ts`:

```ts
if (!runtimeCapabilities.serverAi) return analyzeTaskInBrowser(input);
```

In `App.tsx`, replace the direct `/api/generate-today` call with a small `generateToday(tasks)` service that selects `generateTodayInBrowser` for static web and preserves the current server request otherwise.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- --run src/L1-ui/features/ai/ai-settings.test.tsx src/L1-ui/features/tasks/analysis-step-editor.test.tsx src/App.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/L1-ui/features/ai src/L1-ui/features/tasks/analyze-task.ts src/L1-ui/features/tasks/analysis-step-editor.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: use visitor ai settings on web"
```

### Task 6: Replace web news scraping with manual AI-assisted entry

**Files:**
- Modify: `src/L4-data/news-model.ts`
- Modify: `src/L4-data/news-repository.ts`
- Modify: `src/L4-data/news-repository.test.ts`
- Create: `src/L1-ui/features/news/manual-news-dialog.tsx`
- Create: `src/L1-ui/features/news/manual-news-dialog.test.tsx`
- Modify: `src/L1-ui/features/news/news-window.tsx`
- Modify: `src/L1-ui/features/news/news-window.test.tsx`

- [ ] **Step 1: Write failing model and UI tests**

Define `ManualNewsInput` with `sourceId`, `url`, `title`, and `body`. Test that title or body is required, non-HTTP(S) URLs are rejected, duplicate normalized URLs are rejected, save creates a `NewsItem` with `contentBasis: "网页正文"`, and optional AI summary fields are persisted.

In web-mode `NewsWindow`, assert `手动添加消息` is present while `刷新`, `登录`, and `定点刷新` are absent. Submit a title and body and assert the new card appears. Mock summarization and assert generated summary details render.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run src/L4-data/news-repository.test.ts src/L1-ui/features/news/manual-news-dialog.test.tsx src/L1-ui/features/news/news-window.test.tsx`

Expected: FAIL because manual message APIs and dialog do not exist.

- [ ] **Step 3: Implement the manual news model and repository operation**

Add:

```ts
export type ManualNewsInput = {
  sourceId: string;
  url: string;
  title: string;
  body: string;
};
```

Add `addManualItem(input, summary?)` to the repository. It trims inputs, validates source existence, requires title or body, normalizes an optional URL, checks item IDs and normalized URLs for duplicates, constructs a `NewsItem` with `crypto.randomUUID()`, current timestamps, source metadata, `contentBasis: "网页正文"`, and empty summary arrays when AI is not used, then calls the existing merge path.

- [ ] **Step 4: Implement the focused dialog and capability-specific controls**

`ManualNewsDialog` owns only form state and calls injected `onSave(input, summarize)`. Include source selection, URL, title, body, a `使用 AI 生成摘要` checkbox, cancel/save actions, busy state, and an `aria-live` error. Treat all body content as plain text.

In `NewsWindow`, branch only the action controls using `runtimeCapabilities.automaticNews`. Desktop retains existing refresh/login/schedule behavior. Web shows the manual button and the text `网页版不自动抓取；请手动提供链接、标题或正文。桌面版仍支持自动刷新。`

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- --run src/L4-data/news-repository.test.ts src/L1-ui/features/news/manual-news-dialog.test.tsx src/L1-ui/features/news/news-window.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/L4-data/news-model.ts src/L4-data/news-repository.ts src/L4-data/news-repository.test.ts src/L1-ui/features/news
git commit -m "feat: add manual news workflow for web"
```

### Task 7: Gate native desktop actions and improve portable backups

**Files:**
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/L5-services/widget-window.test.ts`
- Modify: `src/L1-ui/features/desktop/desktop-config-page.tsx`
- Modify: `src/L1-ui/features/desktop/desktop-config-page.test.tsx`
- Modify: `src/L4-data/backup-schema.ts`
- Modify: `src/L4-data/backup-schema.test.ts`
- Modify: `src/L1-ui/features/settings/settings-center.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.test.tsx`

- [ ] **Step 1: Write failing native-gating and backup tests**

Assert `openDesktopWidget` rejects with `桌面组件仅在桌面版中可用` in static web mode without fetching `/api/desktop-widget/open`. Assert the web desktop configuration page shows an explanation instead of an enabled launch button.

Extend backup tests so a created backup contains `workspace`, `news`, and browser AI metadata excluding `apiKey`. Import must reject malformed versions before writing any storage key.

- [ ] **Step 2: Verify focused tests fail**

Run: `npm test -- --run src/L5-services/widget-window.test.ts src/L1-ui/features/desktop/desktop-config-page.test.tsx src/L4-data/backup-schema.test.ts src/L1-ui/features/settings/settings-center.test.tsx`

Expected: FAIL on the current server fallback and version-1 task-only backup.

- [ ] **Step 3: Implement native gating**

At the start of `openDesktopWidget`, reject when `runtimeCapabilities.staticWeb` is true. Preserve the existing browser-to-local-server fallback for non-static desktop development. In the desktop configuration page, render the explanatory state when `desktopWidget` is false.

- [ ] **Step 4: Implement backup version 2**

Define `MemoAgentBackupV2` with `version: 2`, `exportedAt`, `workspace`, `news`, and `ai` containing provider/baseUrl/model/enabled but no API Key. `parseBackup` accepts both version 1 and version 2, validates before mutation, and converts version 1 through existing task migration. Update settings import/export to use the new schema rather than copying arbitrary localStorage keys.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- --run src/L5-services/widget-window.test.ts src/L1-ui/features/desktop/desktop-config-page.test.tsx src/L4-data/backup-schema.test.ts src/L1-ui/features/settings/settings-center.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/L5-services/widget-window.ts src/L5-services/widget-window.test.ts src/L1-ui/features/desktop src/L4-data/backup-schema.ts src/L4-data/backup-schema.test.ts src/L1-ui/features/settings
git commit -m "feat: separate web and desktop-only capabilities"
```

### Task 8: Configure the GitHub Pages build and deployment workflow

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Add a Pages-specific build script and dynamic Vite configuration**

Add `"build:web": "tsc -b && vite build --mode github-pages"` to `package.json`.

Change Vite config to callback form and exclude server middleware from the static build:

```ts
export default defineConfig(({ mode }) => {
  const staticWeb = mode === "github-pages";
  return {
    base: staticWeb ? "/note/" : "/",
    plugins: [
      react(),
      ...(!staticWeb ? [authRoutes(), desktopWidgetRoutes(), workspaceRoutes(), newsRoutes(), aiRoutes()] : []),
    ],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
      exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
    },
  };
});
```

- [ ] **Step 2: Run a clean Pages build and inspect resource paths**

Run: `npm run build:web`

Expected: exit code 0 and `dist/index.html` references `/note/assets/...`.

Run: `Select-String -Path dist/index.html -Pattern '/note/assets/'`

Expected: at least one match and no root-only `/assets/` reference.

- [ ] **Step 3: Create the GitHub Actions workflow**

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test -- --run
      - run: npm run build:web
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Run local verification**

Run: `npm run typecheck; if ($LASTEXITCODE) { exit $LASTEXITCODE }; npm test -- --run; if ($LASTEXITCODE) { exit $LASTEXITCODE }; npm run build:web`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts package.json package-lock.json .github/workflows/deploy-pages.yml
git commit -m "ci: deploy web app to github pages"
```

### Task 9: Document, audit, and publish the stable branch

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update operating documentation**

Document:

- Web URL `https://yuwenhe1234.github.io/note/`.
- `npm run build:web` and the `/note/` base path.
- Browser-only persistence and backup behavior.
- User-owned API Key storage, AI provider CORS limitation, and data sent to the selected AI provider.
- Manual news entry on web versus automatic collection on desktop.
- GitHub repository setting: Settings → Pages → Build and deployment → Source → GitHub Actions.
- Tauri desktop development remains `npm run tauri dev`; Releases packaging is a future operation.

- [ ] **Step 2: Run the full verification suite**

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm test -- --run`

Expected: all tests pass.

Run: `npm run build`

Expected: desktop/development production build exits 0.

Run: `npm run build:web`

Expected: static web build exits 0.

- [ ] **Step 3: Inspect the final diff and secrets**

Run: `git diff --check`

Expected: no output.

Run: `git grep -n -E 'sk-[A-Za-z0-9_-]{12,}|Authorization: Bearer [A-Za-z0-9_-]{12,}' -- ':!docs/superpowers/plans/*'`

Expected: no real credential matches.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md
git commit -m "docs: explain web and desktop editions"
```

- [ ] **Step 5: Create and push the stable branch**

First verify the exact repository and clean state:

```bash
git remote get-url origin
git status --short
```

Expected: `https://github.com/Yuwenhe1234/note.git` and no output from status.

Create `main` at the verified implementation commit and push it:

```bash
git branch main
git push -u origin main
```

Expected: remote branch `main` is created and tracks `origin/main`.

- [ ] **Step 6: Enable Pages and verify the deployment**

In the GitHub repository, select Settings → Pages → Build and deployment → Source → GitHub Actions. Trigger the workflow if the initial push did not run it, wait for both jobs to pass, then open `https://yuwenhe1234.github.io/note/`.

Acceptance check: create a task, refresh and confirm persistence; configure a test AI provider; manually add a news item; confirm no request is made to `/api/auth`, `/api/workspace`, `/api/news/refresh`, or `/api/desktop-widget/open`.
