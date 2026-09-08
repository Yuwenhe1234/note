# News Scheduled Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted daily scheduled refreshes with one to three user-selected times that run independently of the news page.

**Architecture:** Store a validated schedule in the news repository. A singleton scheduler receives a refresh callback from the application root, evaluates wall-clock time every 30 seconds, and serializes automatic refreshes; the news page only edits and displays the persisted schedule.

**Tech Stack:** React, TypeScript, Vitest, localStorage

---

### Task 1: Persist and validate schedules

**Files:**
- Create: `src/L5-services/news-refresh-scheduler.ts`
- Create: `src/L5-services/news-refresh-scheduler.test.ts`
- Modify: `src/L4-data/news-model.ts`
- Modify: `src/L4-data/news-repository.ts`
- Test: `src/L4-data/news-repository.test.ts`

- [ ] Write failing tests for 1–3 sorted unique `HH:mm` values, rejection of invalid/fourth values, and persisted `enabled`, `lastTriggeredMinute`, and `lastCompletedAt` fields.
- [ ] Run: `npm test -- --run src/L4-data/news-repository.test.ts src/L5-services/news-refresh-scheduler.test.ts`; expect failure.
- [ ] Add `NewsRefreshSchedule`, repository read/write methods, and a scheduler with injectable `now`, `setInterval`, and refresh callback. It triggers once per configured minute, skips while running, and writes completion time only after success.
- [ ] Re-run focused tests; expect pass.

### Task 2: Run independently from the page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/L1-ui/features/news/news-client.ts`
- Test: `src/App.test.tsx`

- [ ] Write a failing root-level test proving a configured due schedule invokes the refresh path when `NewsWindow` is not rendered.
- [ ] Run: `npm test -- --run src/App.test.tsx`; expect failure.
- [ ] Initialize one scheduler in `App` after local workspace data is available. Its callback loads sources/items from the repository, requests refresh, replaces latest items, persists cursors, and leaves the scheduler alive when feature navigation changes.
- [ ] Re-run focused tests; expect pass.

### Task 3: Add schedule settings UI

**Files:**
- Modify: `src/L1-ui/features/news/news-window.tsx`
- Modify: `src/L1-ui/features/news/news-window.test.tsx`
- Modify: `src/index.css`

- [ ] Write failing tests for open dialog, add/remove up to three time inputs, invalid/duplicate save rejection, and display of next/last automatic refresh values.
- [ ] Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`; expect failure.
- [ ] Add a compact modal below the refresh action containing enable switch, 1–3 time inputs, add/remove controls, validation feedback, and saved status. Do not create duplicate timers in the page.
- [ ] Re-run focused tests; expect pass.

### Task 4: Verify

- [ ] Run `npm test -- --run`, `npm run typecheck`, and `npm run build`.
- [ ] Run `git diff --check`; confirm only scheduler, schedule persistence, root integration, settings UI, and tests changed.
- [ ] Commit implementation files with `feat: schedule daily news refresh`.
