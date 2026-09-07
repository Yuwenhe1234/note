# Local Workspace Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist tasks, today todos, settings, and editable UI text in project-local files that survive refreshes, restarts, and port changes.

**Architecture:** A server-side workspace store owns validation, backup fallback, and atomic file writes under `.local/`. A small frontend repository loads and saves complete workspace snapshots; `App` hydrates before autosave and migrates current-origin localStorage once.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Vite middleware, React, Vitest.

---

### Task 1: Server workspace store

**Files:**
- Create: `server/workspace-store.ts`
- Create: `server/workspace-store.test.ts`

- [ ] Write failing tests for missing file, valid save/load, backup recovery, invalid data, and stale revision rejection.
- [ ] Run `npm test -- --run server/workspace-store.test.ts`; expect import failure.
- [ ] Implement `createWorkspaceStore(filePath)` with `load()` and `save(snapshot)` using temporary write, backup copy, and rename.
- [ ] Validate `version`, `revision`, task arrays, today todo arrays, settings, and editable text.
- [ ] Re-run the focused tests; expect PASS.

### Task 2: Workspace API routes

**Files:**
- Create: `server/workspace-routes.ts`
- Modify: `vite.config.ts`

- [ ] Add Vite middleware for `GET /api/workspace` and `PUT /api/workspace`.
- [ ] Store files at `.local/workspace-data.json` and `.local/workspace-data.backup.json`.
- [ ] Register the middleware before the AI routes and verify malformed input returns JSON error without overwriting data.

### Task 3: Frontend repository and migration

**Files:**
- Create: `src/L4-data/workspace-repository.ts`
- Create: `src/L4-data/workspace-repository.test.ts`

- [ ] Write failing tests for load, save, current-origin localStorage migration, and default snapshot creation.
- [ ] Implement typed `WorkspaceDataV1`, `loadWorkspace`, `saveWorkspace`, and `createLegacySnapshot`.
- [ ] Include tasks, today todos, settings, site name, hero text, and today focus text; never include API keys.
- [ ] Run the focused repository tests; expect PASS.

### Task 4: App hydration and autosave

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/L4-data/settings-repository.ts`
- Modify: `src/L1-ui/features/settings/settings-center.tsx`

- [ ] Add failing app tests proving server data replaces examples and mutations trigger a debounced save.
- [ ] Add a loading gate and hydrate tasks, today todos, settings, and editable text from the workspace API.
- [ ] If no file exists, migrate the current localStorage snapshot and save it once.
- [ ] After hydration, debounce complete snapshot saves by 300ms and show saving/saved/failed state.
- [ ] Route settings and editable text mutations through the workspace state while retaining localStorage as a migration fallback.
- [ ] Re-register future, incomplete today reminders after hydration.

### Task 5: Data management and final verification

**Files:**
- Modify: `src/L4-data/backup-schema.ts`
- Modify: `src/L1-ui/features/settings/settings-center.tsx`
- Modify: `PROJECT.md`

- [ ] Export and import complete workspace snapshots without AI API keys.
- [ ] Keep workspace clearing separate from AI configuration clearing.
- [ ] Document storage locations, migration, backup recovery, and autosave behavior.
- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`; expect all commands to exit 0.
