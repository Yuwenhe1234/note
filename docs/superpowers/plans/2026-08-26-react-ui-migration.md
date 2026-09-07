# React UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current DOM-driven UI with a Vite + React + TypeScript + Tailwind application while preserving the five-layer Agent architecture, existing local task data, and the four-item primary navigation.

**Architecture:** React owns only L1 rendering and interaction. L2–L5 become typed ES modules with the current intent, plugin, repository, and storage behavior preserved. A compatibility storage adapter reads the existing browser keys so migration does not erase tasks.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, Vitest, Testing Library, lucide-react, GSAP

---

### Task 1: Establish the Vite and test foundation

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`
- Create: `src/main.tsx`, `src/index.css`, `src/test/setup.ts`
- Modify: `index.html`

- [ ] Add scripts for `dev`, `build`, `test`, and `typecheck`, with runtime dependencies `react`, `react-dom`, `lucide-react`, `gsap` and development dependencies for Vite, TypeScript, Tailwind, PostCSS, Vitest, jsdom, and Testing Library.
- [ ] Configure Vitest with `environment: 'jsdom'` and setup file `src/test/setup.ts` containing `import '@testing-library/jest-dom/vitest'`.
- [ ] Replace the old script list in `index.html` with `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>`.
- [ ] Create a minimal `main.tsx` that mounts `<App />` under `React.StrictMode`.
- [ ] Run `npm install`, then `npm run typecheck` and `npm test -- --run`; expect both commands to complete successfully.
- [ ] Commit foundation files with `chore: establish React Vite foundation`.

### Task 2: Migrate and test L4 task compatibility

**Files:**
- Create: `src/types/task.ts`
- Create: `src/L5-services/storage-driver.ts`
- Create: `src/L4-data/schema.ts`, `src/L4-data/task-repository.ts`
- Test: `src/L4-data/task-repository.test.ts`

- [ ] Define typed `Task`, `Subtask`, `TaskStatus`, `TaskType`, `Priority`, `LearningSupport`, and `RiskReminder` models, retaining `extended_fields` compatibility.
- [ ] Write a failing test that places an old-format task array in localStorage, initializes the repository, and expects the same task ID, title, subtasks, and extended fields to be returned.
- [ ] Run `npm test -- --run src/L4-data/task-repository.test.ts`; expect failure because the repository does not exist.
- [ ] Implement the storage driver and repository CRUD/query/statistics functions using the existing storage key discovered in the old repository.
- [ ] Add malformed-data coverage that expects an empty result without overwriting the original localStorage value.
- [ ] Run the repository test and typecheck; expect all tests to pass.
- [ ] Commit with `feat: preserve task data in typed repository`.

### Task 3: Migrate and test the Agent/plugin core

**Files:**
- Create: `src/types/agent.ts`
- Create: `src/L2-agent/agent.ts`, `src/L2-agent/plugin-registry.ts`, `src/L2-agent/intent-router.ts`, `src/L2-agent/memory-manager.ts`
- Create: `src/L3-plugins/base-plugin.ts`, `src/L3-plugins/task-manager.ts`, `src/L3-plugins/task-analyzer.ts`, `src/L3-plugins/learning-assistant.ts`, `src/L3-plugins/risk-advisor.ts`, `src/L3-plugins/stats-plugin.ts`
- Test: `src/L2-agent/agent.test.ts`

- [ ] Define `AgentPlugin`, `AgentResult`, `AgentError`, `Intent`, and dispatch payload types.
- [ ] Write failing tests for task creation/query, full analysis composition, plugin-not-found errors, and the “今日待办” natural-language route.
- [ ] Run `npm test -- --run src/L2-agent/agent.test.ts`; expect failure before implementation.
- [ ] Port the current rules and plugin behavior into focused TypeScript modules without DOM access.
- [ ] Return `{ ok, data, error }` result objects instead of swallowing plugin failures.
- [ ] Run Agent and repository tests plus typecheck; expect all to pass.
- [ ] Commit with `feat: migrate typed Agent plugin core`.

### Task 4: Build the visual shell and navigation

**Files:**
- Create: `src/App.tsx`, `src/L1-ui/app-shell.tsx`
- Create: `src/L1-ui/components/glass-nav.tsx`, `src/L1-ui/components/ambient-background.tsx`, `src/L1-ui/components/ui.tsx`
- Create: `src/L1-ui/hooks/use-reduced-motion.ts`, `src/L1-ui/hooks/use-agent.ts`
- Test: `src/L1-ui/app-shell.test.tsx`
- Modify: `src/index.css`, `tailwind.config.js`

- [ ] Write a failing navigation test that expects exactly four primary items: 任务清单、今日待办、其他功能、设置.
- [ ] Run the test and confirm it fails before the shell exists.
- [ ] Add the dark design tokens, liquid-glass surfaces, Instrument Serif/Barlow imports with system fallbacks, focus styles, and reduced-motion rules.
- [ ] Implement the four-item glass navigation and lightweight GSAP entrance/parallax behavior, disabled for touch and reduced-motion users.
- [ ] Implement reusable Button, Card, Input, Select, Modal, Toast, EmptyState, and StatusBadge components.
- [ ] Run UI tests, typecheck, and build; expect all to pass.
- [ ] Commit with `feat: add immersive glass application shell`.

### Task 5: Implement task list, creation wizard, and detail flow

**Files:**
- Create: `src/L1-ui/pages/task-list-page.tsx`, `src/L1-ui/features/tasks/task-card.tsx`, `task-editor.tsx`, `analysis-review.tsx`, `task-detail.tsx`
- Test: `src/L1-ui/features/tasks/task-flow.test.tsx`

- [ ] Write failing tests for filtering, opening the new-task editor, moving to AI analysis review, editing a generated subtask, saving, completing, and deleting with confirmation.
- [ ] Implement the statistics row, search/filter controls, task cards, detail panel, and two-stage creation flow.
- [ ] Route analysis and CRUD through `useAgent`; keep business rules out of components.
- [ ] Preserve Escape close and Ctrl/Command+Enter save behavior with visible validation errors.
- [ ] Run task-flow tests, all tests, typecheck, and build; expect success.
- [ ] Commit with `feat: rebuild typed task workflow`.

### Task 6: Implement today, secondary features, and settings

**Files:**
- Create: `src/L1-ui/pages/today-page.tsx`, `more-page.tsx`, `settings-page.tsx`
- Create: `src/L1-ui/features/chat/chat-page.tsx`, `companion/companion-page.tsx`, `messages/messages-page.tsx`, `agent/agent-page.tsx`, `desktop/desktop-page.tsx`
- Test: `src/L1-ui/secondary-pages.test.tsx`

- [ ] Write failing tests for today/overdue rendering, voice fallback, six configuration-driven “其他功能” cards, secondary-page back navigation, and settings sections.
- [ ] Implement manual and speech-assisted today-task creation plus local reminder configuration status.
- [ ] Implement local interactive states for chat history/task context, companion controls, message link sources, Agent status, and desktop placeholder; label unavailable external services as unconfigured.
- [ ] Implement settings groups for appearance, interaction, AI/API, reminders, and data, masking API secrets.
- [ ] Run tests, typecheck, and build; expect success.
- [ ] Commit with `feat: complete primary and secondary React pages`.

### Task 7: Final regression and documentation

**Files:**
- Modify: `PROJECT.md`
- Modify: `docs/superpowers/specs/2026-08-26-react-ui-migration-design.md` only if implementation decisions require clarification

- [ ] Run `npm test -- --run`, `npm run typecheck`, and `npm run build`; all must exit 0.
- [ ] Start the Vite preview and manually verify desktop and narrow mobile layouts, four-item navigation, task persistence, two-stage creation, secondary back navigation, keyboard focus, and reduced-motion behavior.
- [ ] Update `PROJECT.md` with the new commands, directory structure, implemented status, and migration note.
- [ ] Check `git diff --check` and verify no old user data files or unrelated changes are included.
- [ ] Commit with `docs: document React application workflow`.

