# Multi-Provider AI Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure local configuration and real task analysis for OpenAI, DeepSeek, Qwen, and Zhipu.

**Architecture:** A Vite development-server plugin owns local-only `/api/ai/config`, `/api/ai/test`, and `/api/analyze-task` routes. React never persists API keys; it calls those routes and renders validated analysis results. A provider registry normalizes the four providers into one chat-completions request shape.

**Tech Stack:** Vite, React, TypeScript, Vitest, Node.js `fetch`, local JSON configuration ignored by Git.

---

### Task 1: Add local AI configuration and provider registry

**Files:**
- Create: `server/ai-config.ts`
- Create: `server/provider-registry.ts`
- Create: `server/ai-config.test.ts`
- Modify: `.gitignore`

- [ ] Write a failing test for `sanitizeConfig()` that removes `apiKey` from returned browser configuration and retains provider, baseUrl, model, and enabled.
- [ ] Run `npm test -- --run server/ai-config.test.ts`; expected failure: module not found.
- [ ] Implement `AiConfig`, `saveConfig()`, `loadConfig()`, and `sanitizeConfig()` using `.local/ai-config.json`; add `.local/` to `.gitignore`.
- [ ] Implement the `PROVIDERS` registry with OpenAI, DeepSeek, Qwen, Zhipu, and custom defaults.
- [ ] Run the test; expected result: PASS.

### Task 2: Add local Vite API routes and analysis validation

**Files:**
- Create: `server/ai-routes.ts`
- Create: `server/analysis-schema.ts`
- Create: `server/analysis-schema.test.ts`
- Modify: `vite.config.ts`

- [ ] Write failing tests for `parseAnalysis()` accepting valid JSON and rejecting a zero duration, empty title, or fewer than two steps.
- [ ] Run `npm test -- --run server/analysis-schema.test.ts`; expected failure: module not found.
- [ ] Implement `/api/ai/config` GET/PUT, `/api/ai/test` POST, and `/api/analyze-task` POST in a Vite plugin. The plugin reads the local config, constructs a provider request, extracts JSON, validates it, and returns `{ ok, data }` or `{ ok: false, error }`.
- [ ] Use a system instruction requiring `summary`, `priority`, `estimatedMinutes`, and 2–8 steps with positive integer `minutes`.
- [ ] Run both server tests; expected result: PASS.

### Task 3: Build AI settings and connection test UI

**Files:**
- Create: `src/L1-ui/features/ai/ai-settings.tsx`
- Create: `src/L1-ui/features/ai/ai-settings.test.tsx`
- Modify: `src/App.tsx`, `src/index.css`

- [ ] Write a failing UI test that selects DeepSeek, enters a key, saves it, and confirms the rendered status says the key is configured without rendering the key text.
- [ ] Run `npm test -- --run src/L1-ui/features/ai/ai-settings.test.tsx`; expected failure: module not found.
- [ ] Implement provider selector, base URL, model, masked API key input, enabled switch, save action, and connection-test result. Load only sanitized configuration into the page.
- [ ] Render the component under the existing “设置 → AI 与 API” card.
- [ ] Run the settings UI test; expected result: PASS.

### Task 4: Connect the new-task analysis stage to the API

**Files:**
- Create: `src/L1-ui/features/tasks/analyze-task.ts`
- Create: `src/L1-ui/features/tasks/analyze-task.test.ts`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/index.css`

- [ ] Write a failing test for `analyzeTask()` mapping a successful API response to editable step titles/minutes and mapping a missing configuration response to a user-facing setup error.
- [ ] Run `npm test -- --run src/L1-ui/features/tasks/analyze-task.test.ts`; expected failure: module not found.
- [ ] Implement API client and add states for loading, error, summary, priority, estimated minutes, and editable generated steps.
- [ ] On “下一步”, call the API only when AI is enabled/configured; otherwise show a settings link and retain manual fields.
- [ ] Require analysis completion or explicit manual fallback before “确认并保存”; persist steps and total minutes with the task.
- [ ] Run the new analysis test and existing task workflow tests; expected result: PASS.

### Task 5: Verify local launch and document usage

**Files:**
- Modify: `启动项目.cmd`, `PROJECT.md`
- Test: `src/App.test.tsx`, `server/*.test.ts`, `src/L1-ui/**/*.test.tsx`

- [ ] Update the launcher to keep Vite’s local API middleware available and document the first-run AI configuration flow.
- [ ] Run `npm test -- --run`, `npm run typecheck`, and `npm run build`; expected result: all exit 0.
- [ ] Start `npm run dev`, save a test configuration, call the connection test, and verify no API key appears in the browser GET response or `git status`.
- [ ] Commit with `feat: add secure multi-provider task analysis`.

