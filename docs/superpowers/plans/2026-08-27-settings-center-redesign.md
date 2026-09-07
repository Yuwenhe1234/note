# Lightweight Settings Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder settings cards with five functional secondary pages and a simplified CCSwitch-style model provider selector.

**Architecture:** `SettingsCenter` owns secondary-page routing. Browser-safe preferences live in a typed localStorage repository; AI provider credentials remain in the existing local Vite API service. Each settings page is an independent React component with focused tests.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite local API middleware.

---

### Task 1: Extract settings navigation

**Files:**
- Create: `src/L1-ui/features/settings/settings-center.tsx`
- Test: `src/L1-ui/features/settings/settings-center.test.tsx`
- Modify: `src/App.tsx`

- [ ] Write a failing test that enters each of the five cards and returns to the settings hub.
- [ ] Run the test and verify it fails because `SettingsCenter` does not exist.
- [ ] Implement typed routes `root | appearance | interaction | ai | reminders | data` and render the hub or active page.
- [ ] Replace the settings JSX in `App.tsx` with `<SettingsCenter />`.
- [ ] Run the test and existing app tests; expect PASS.

### Task 2: Redesign provider management

**Files:**
- Modify: `src/L1-ui/features/ai/ai-settings.tsx`
- Modify: `src/L1-ui/features/ai/ai-settings.test.tsx`
- Modify: `server/ai-config.ts`, `server/ai-routes.ts`

- [ ] Write failing tests for selecting a provider card, selecting a model, testing connection, setting current, and deleting only custom providers.
- [ ] Replace the full technical form with current-provider summary and provider cards.
- [ ] Keep API Key and model in the simple editor; move Base URL behind an “高级设置” disclosure.
- [ ] Store provider profiles and active provider in the local server config without exposing keys in GET responses.
- [ ] Run provider and server tests; expect PASS.

### Task 3: Add typed browser preference pages

**Files:**
- Create: `src/L4-data/preferences.ts`
- Create: `src/L4-data/preferences.test.ts`
- Create: `src/L1-ui/features/settings/appearance-settings.tsx`
- Create: `src/L1-ui/features/settings/interaction-settings.tsx`
- Create: `src/L1-ui/features/settings/reminder-settings.tsx`

- [ ] Write a failing repository test that saves and restores appearance, interaction, and reminder preferences.
- [ ] Implement a versioned localStorage repository with defaults and malformed-data fallback.
- [ ] Implement appearance controls for accent, font size, and density; interaction controls for animation, reduced motion, confirmation, and editing hints; reminder controls for browser notifications, default lead time, sound, and AI reminders.
- [ ] Apply appearance and motion preferences through root CSS classes and custom properties.
- [ ] Run repository and UI tests; expect PASS.

### Task 4: Complete data management

**Files:**
- Create: `src/L1-ui/features/settings/data-settings.tsx`
- Create: `src/L1-ui/features/settings/data-settings.test.tsx`
- Modify: `src/App.tsx`

- [ ] Write failing tests for exporting valid JSON, rejecting malformed imports without changing tasks, and requiring confirmation before clearing.
- [ ] Pass task export/import/clear callbacks from `App` into `SettingsCenter` and `DataSettings`.
- [ ] Implement download, file import validation, clear confirmation, and preference reset.
- [ ] Run data tests and app tests; expect PASS.

### Task 5: Final verification

**Files:**
- Modify: `PROJECT.md`

- [ ] Document the five settings pages and simplified AI configuration flow.
- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`; all must exit 0.
- [ ] Verify `/api/ai/config` does not contain `apiKey` and `.local/` is ignored.
- [ ] Commit with `feat: complete lightweight settings center`.

