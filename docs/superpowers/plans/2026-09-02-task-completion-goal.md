# Task Completion Goal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-generated, user-editable completion goal below task descriptions and display both compactly in the task list.

**Architecture:** Extend the L4 task model and backup schema with a backward-compatible `goal` field. Extend the L1 description dialog to edit description and goal atomically, update the L5-facing AI response schema to require a goal, and keep `App` as the draft state owner.

**Tech Stack:** React, TypeScript, Vite middleware, Vitest, Testing Library.

---

### Task 1: Task goal data and backup migration

**Files:**
- Modify: `src/L4-data/task-model.ts`
- Modify: `src/L4-data/task-model.test.ts`
- Modify: `src/L4-data/backup-schema.ts`
- Modify: `src/L4-data/backup-schema.test.ts`

- [ ] Add a failing model test asserting a legacy task without `goal` migrates to `goal: ""`, while a current task preserves `goal: "完成可运行原型"`.
- [ ] Run `npm test -- --run src/L4-data/task-model.test.ts`; expect the goal assertions to fail.
- [ ] Add `goal: string` to `Task`, make migratable input accept optional `goal`, and return `goal: task.goal?.trim() || ""` from `migrateTask`.
- [ ] Add a failing backup test that round-trips `{ goal: "完成验收" }` and accepts a backup without `goal`.
- [ ] Add `goal?: string` to `BackupTask`, then run `npm test -- --run src/L4-data/task-model.test.ts src/L4-data/backup-schema.test.ts`; expect PASS.
- [ ] Commit with `git commit -m "feat: add task completion goal data"`.

### Task 2: Atomic description and goal editor

**Files:**
- Modify: `src/L1-ui/features/tasks/task-description-dialog.tsx`
- Modify: `src/L1-ui/features/tasks/task-description-dialog.test.tsx`
- Modify: `src/index.css`

- [ ] Replace the component test props with `description`, `goal`, and `onSave(details)`; assert the dialog contains `任务说明内容` and `任务完成目标`, and Save emits `{ description: "新说明", goal: "通过验收" }`.
- [ ] Add a cancellation assertion proving neither field is emitted after Cancel.
- [ ] Run `npm test -- --run src/L1-ui/features/tasks/task-description-dialog.test.tsx`; expect prop/type or query failures.
- [ ] Change the public API to:

```ts
type TaskDetails = { description: string; goal: string };
```

Maintain local drafts for both values and call `onSave({ description: descriptionDraft.trim(), goal: goalDraft.trim() })` only on confirmation.
- [ ] Render the goal textarea immediately below the description textarea with label “任务完成目标”.
- [ ] Add `.task-goal-editor` styling and run the focused component test; expect PASS.
- [ ] Commit with `git commit -m "feat: edit task completion goals"`.

### Task 3: AI goal schema and generation

**Files:**
- Modify: `server/analysis-schema.ts`
- Modify: `server/analysis-schema.test.ts`
- Modify: `server/ai-routes.ts`
- Modify: `src/L1-ui/features/tasks/analyze-task.ts`

- [ ] Update the valid schema fixture to include `"goal":"完成两个练习并全部通过"`; add a failing test that rejects a missing or blank goal.
- [ ] Run `npm test -- --run server/analysis-schema.test.ts`; expect the missing-goal case to pass incorrectly before implementation.
- [ ] Add `goal: string` to `Analysis` and validate `data.goal.trim()` with a maximum of 80 characters.
- [ ] Update the model prompt JSON example with top-level `goal` and explicitly require a clear, verifiable result no longer than 80 Chinese characters.
- [ ] Add `goal` to client `TaskAnalysis`, then run `npm test -- --run server/analysis-schema.test.ts`; expect PASS.
- [ ] Commit with `git commit -m "feat: generate completion goals with AI"`.

### Task 4: App integration and compact task-card display

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/index.css`
- Modify: `PROJECT.md`

- [ ] Add failing app tests that open the editor, save a goal, and find it in the task card; assert searching the goal keeps the task visible; assert an empty goal renders no “完成目标” region.
- [ ] Run `npm test -- --run src/App.test.tsx`; expect goal queries to fail.
- [ ] Add `goalDraft` state, initialize it for new/edit flows, populate it from `analysis.goal`, save it into tasks, and pass it through imports via `migrateTask`.
- [ ] Update both `TaskDescriptionDialog` call sites to save description and goal together.
- [ ] Include `task.goal` in search text.
- [ ] Render task description with class `task-description-preview` and a clickable `task-goal-preview` only when goal is non-empty; both open the shared editor.
- [ ] Add two-line clamping styles using `display: -webkit-box`, `-webkit-line-clamp: 2`, and `overflow: hidden` for both description and goal.
- [ ] Document the goal field, AI generation, editing, backup and task-card rules in `PROJECT.md`.
- [ ] Run the full gate:

```bash
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0.
- [ ] Commit with `git commit -m "feat: show completion goals in task list"`.
