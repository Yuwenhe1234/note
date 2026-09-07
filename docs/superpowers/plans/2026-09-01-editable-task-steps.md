# Editable Task Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace numeric step counts with hour-based step objects, bubble completion controls, and an arrow-opened step editor.

**Architecture:** A focused task model module owns step creation, migration, validation, progress, and completion operations. The analysis editor and task card consume those pure functions; `App` remains the state owner until the repository layer is completed.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Task step model and migration

**Files:**
- Create: `src/L4-data/task-model.ts`
- Test: `src/L4-data/task-model.test.ts`
- Modify: `src/App.tsx`, `src/L4-data/backup-schema.ts`

- [ ] Test step creation, minute-to-hour migration, stable IDs, 0.25-hour normalization, progress calculation, toggle-one, and toggle-all.
- [ ] Implement `TaskStep`, `Task`, `createSteps`, `migrateTask`, `taskProgress`, `toggleStep`, `toggleAllSteps`, and `updateStep`.
- [ ] Replace the local `Task` type in `App.tsx`; migrate initial and imported tasks.
- [ ] Accept old numeric `steps` in backup parsing and export only arrays.
- [ ] Run model, backup, and app tests; expect PASS.

### Task 2: Editable AI analysis result

**Files:**
- Create: `src/L1-ui/features/tasks/analysis-step-editor.tsx`
- Test: `src/L1-ui/features/tasks/analysis-step-editor.test.tsx`
- Modify: `src/App.tsx`, `src/index.css`

- [ ] Test editing title/minutes, adding a step, deleting a step, and preventing deletion of the last step.
- [ ] Convert AI results into controlled `TaskStep[]` state when analysis succeeds.
- [ ] Render title and minute inputs plus add/delete controls in the second modal stage.
- [ ] Save the final controlled steps into the task; manual fallback uses default step count.
- [ ] Run analysis editor and modal workflow tests; expect PASS.

### Task 3: Task card bubbles and progress

**Files:**
- Create: `src/L1-ui/features/tasks/task-steps.tsx`
- Test: `src/L1-ui/features/tasks/task-steps.test.tsx`
- Modify: `src/App.tsx`, `src/index.css`

- [ ] Test that clicking one bubble updates only that step; completing all bubbles completes the task; restoring one bubble restores the task.
- [ ] Render wrapping step bubbles with checkbox, sequence, title, hours, completed style, and accessible labels; do not render inputs in the card.
- [ ] Render completed/total text, percentage, and progress bar on each task card.
- [ ] Wire the task-level completion circle to `toggleAllSteps`.
- [ ] Recalculate duration from step minutes and statistics from derived task completion.
- [ ] Run task-step, task-list, statistics, and Today tests; expect PASS.

### Task 4: Arrow editor, backup compatibility, and final gate

**Files:**
- Modify: `src/App.tsx`, `src/L4-data/backup-schema.test.ts`, `PROJECT.md`

- [ ] Make the arrow open a full task/step editor; load existing steps, preserve IDs and completion states, and support add/delete/reorder.
- [ ] Test importing old numeric steps and new step arrays, then round-trip export/import.
- [ ] Document the task step schema, editing behavior, and progress rules.
- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`; all must exit 0.
