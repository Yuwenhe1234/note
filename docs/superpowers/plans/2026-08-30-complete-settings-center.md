# Complete Settings Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build seven functional settings areas where every visible control changes real application behavior.

**Architecture:** `SettingsCenter` handles secondary navigation. Versioned repositories own browser preferences and task backups; the local Vite service owns provider profiles and secrets. `App` consumes task defaults, appearance, interaction, reminder, and data callbacks instead of settings being isolated UI state.

**Tech Stack:** React, TypeScript, Vite middleware, Vitest, Testing Library, localStorage, Notifications API.

---

### Task 1: Versioned settings and backup schemas

**Files:**
- Create: `src/L4-data/settings-schema.ts`
- Create: `src/L4-data/settings-repository.ts`
- Test: `src/L4-data/settings-repository.test.ts`

- [ ] Define `AppSettingsV1` with `taskDefaults`, `appearance`, `interaction`, and `reminders`; export immutable defaults.
- [ ] Write failing tests for valid load/save, malformed JSON fallback, partial migration, and reset.
- [ ] Implement `loadSettings`, `saveSettings`, and `resetSettings` under `memo-agent-settings-v1`.
- [ ] Run `npm test -- --run src/L4-data/settings-repository.test.ts`; expect PASS.

### Task 2: Settings hub and seven real pages

**Files:**
- Create: `src/L1-ui/features/settings/settings-center.tsx`
- Test: `src/L1-ui/features/settings/settings-center.test.tsx`
- Modify: `src/App.tsx`

- [ ] Test navigation for `task-defaults`, `ai`, `reminders`, `appearance`, `interaction`, `data`, and `diagnostics`, including “返回设置”.
- [ ] Implement typed secondary routes and seven cards with descriptions/status summaries.
- [ ] Pass settings and task-data callbacks from `App`; remove duplicate inline settings JSX.
- [ ] Run settings navigation and existing app tests; expect PASS.

### Task 3: Task defaults consumed by task creation and lists

**Files:**
- Create: `src/L1-ui/features/settings/task-defaults-settings.tsx`
- Test: `src/L1-ui/features/settings/task-defaults-settings.test.tsx`
- Modify: `src/App.tsx`

- [ ] Test default priority, duration, step count, completed-task visibility, sort order, today-overdue inclusion, week start, and time format.
- [ ] Add the fields to the task editor and task type; initialize new tasks from saved defaults.
- [ ] Apply sort and completed-task visibility to task-list rendering; apply today scope to Today rendering.
- [ ] Run task defaults and task workflow tests; expect PASS.

### Task 4: CCSwitch-style provider/model control

**Files:**
- Modify: `server/ai-config.ts`, `server/provider-registry.ts`, `server/ai-routes.ts`
- Modify: `src/L1-ui/features/ai/ai-settings.tsx`
- Test: `server/ai-config.test.ts`, `src/L1-ui/features/ai/ai-settings.test.tsx`

- [ ] Replace single config with `{ activeProfileId, profiles[] }`; each profile stores provider, model, endpoint, encrypted-at-rest caveat, key, enabled, and last test result.
- [ ] Test public serialization never returns keys; system profiles cannot be deleted; custom profiles can be added, edited, deleted, and selected.
- [ ] Render current-provider summary and provider cards. Card click opens a simple editor containing Key, model, “测试连接”, and “设为当前”.
- [ ] Put endpoint, timeout, temperature, and retry count inside collapsed “高级设置”.
- [ ] Make `/api/analyze-task` resolve only `activeProfileId`; return a setup error if it is missing or disabled.
- [ ] Run provider, API route, analysis, and UI tests; expect PASS.

### Task 5: Appearance and interaction with real consumers

**Files:**
- Create: `src/L1-ui/features/settings/appearance-settings.tsx`
- Create: `src/L1-ui/features/settings/interaction-settings.tsx`
- Modify: `src/index.css`, `src/App.tsx`
- Test: `src/L1-ui/features/settings/appearance-settings.test.tsx`

- [ ] Test theme/accent/font/density changes root attributes and visibly changes computed styles.
- [ ] Convert accent colors, type scale, page width, and card spacing to CSS variables used across navigation, tasks, modals, feature cards, and settings.
- [ ] Test animation setting disables view/card transitions; wire delete confirmation and edit-trigger preference to task controls.
- [ ] Remove any interaction control that has no application consumer.

### Task 6: Notifications and reminder scheduling

**Files:**
- Create: `src/L5-services/reminder-service.ts`
- Create: `src/L1-ui/features/settings/reminder-settings.tsx`
- Test: `src/L5-services/reminder-service.test.ts`
- Modify: `src/App.tsx`

- [ ] Test permission denied, test notification, automatic deadline reminder, overdue reminder, quiet hours, and timer cleanup.
- [ ] Request permission only from a user action; display the real browser permission state.
- [ ] Schedule reminders for tasks with deadlines using default lead time; reschedule on edit and cancel on completion/delete.
- [ ] Add “发送测试通知”; hide sound/email/location controls until supported.

### Task 7: Safe data management

**Files:**
- Create: `src/L4-data/backup-schema.ts`
- Create: `src/L1-ui/features/settings/data-settings.tsx`
- Test: `src/L1-ui/features/settings/data-settings.test.tsx`
- Modify: `src/App.tsx`

- [ ] Define backup `{ version, exportedAt, tasks, settings, reminders }`; explicitly exclude API keys.
- [ ] Test JSON export, valid import, malformed import leaving current state unchanged, clear-completed, clear-all confirmation, and settings-only reset.
- [ ] Implement download and file import with validate-before-write semantics.
- [ ] Require typed confirmation `清除全部任务` before destructive clearing.

### Task 8: Diagnostics, documentation, and release gate

**Files:**
- Create: `src/L1-ui/features/settings/diagnostics-settings.tsx`
- Modify: `PROJECT.md`, `package.json`

- [ ] Display app version, data schema version, local API health, active provider/model, notification permission, storage bytes, last AI error, and copyable diagnostics text.
- [ ] Add tests ensuring diagnostics never include API keys.
- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`; all must exit 0.
- [ ] Manually verify all seven pages, task creation defaults, provider switching, notification permission, export/import, and browser refresh persistence.

## Delivery checkpoints

1. Tasks 1–3: settings foundation and task defaults.
2. Task 4: AI provider control and real analysis routing.
3. Tasks 5–7: appearance, interactions, reminders, and data safety.
4. Task 8: diagnostics and final regression.

