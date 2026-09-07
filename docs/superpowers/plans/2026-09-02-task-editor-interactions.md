# Task Editor Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native task-description and duration controls with a dedicated description dialog, double-click hour editing, and drag-to-reorder task steps.

**Architecture:** Keep task normalization in the pure L4 model. Add a focused L1 description dialog and extend the existing step editor with isolated duration and reorder behavior; `App` remains the draft-state owner and only composes these components.

**Tech Stack:** React, TypeScript, native HTML drag events, Vitest, Testing Library.

---

### Task 1: Hour normalization for unrestricted durations

**Files:**
- Modify: `src/L4-data/task-model.test.ts`
- Modify: `src/L4-data/task-model.ts`

- [ ] **Step 1: Write failing normalization tests**

Add assertions proving `normalizeHours(6.37) === 6.25`, `normalizeHours(6.4) === 6.5`, and `normalizeHours(-1) === 0.25`.

- [ ] **Step 2: Run the focused test and observe failure if behavior differs**

Run: `npm test -- --run src/L4-data/task-model.test.ts`

Expected: the new rounding assertion fails if unrestricted quarter-hour normalization is not supported.

- [ ] **Step 3: Keep normalization centralized**

Use this implementation in `task-model.ts`:

```ts
export const normalizeHours = (hours: number) =>
  Math.max(0.25, Math.round((Number(hours) || 0) * 4) / 4);
```

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --run src/L4-data/task-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/L4-data/task-model.ts src/L4-data/task-model.test.ts
git commit -m "test: cover unrestricted quarter-hour durations"
```

### Task 2: Dedicated task-description dialog

**Files:**
- Create: `src/L1-ui/features/tasks/task-description-dialog.tsx`
- Create: `src/L1-ui/features/tasks/task-description-dialog.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing component tests**

Test that clicking the summary opens a dialog, typing does not immediately call `onSave`, cancel discards the draft, and “保存说明” calls `onSave` with the final text.

```tsx
render(<TaskDescriptionDialog value="原说明" onSave={onSave} />);
fireEvent.click(screen.getByRole("button", { name: "编辑任务说明" }));
fireEvent.change(screen.getByLabelText("任务说明内容"), { target: { value: "新说明" } });
expect(onSave).not.toHaveBeenCalled();
fireEvent.click(screen.getByRole("button", { name: "保存说明" }));
expect(onSave).toHaveBeenCalledWith("新说明");
```

- [ ] **Step 2: Verify the new test fails because the component does not exist**

Run: `npm test -- --run src/L1-ui/features/tasks/task-description-dialog.test.tsx`

Expected: FAIL resolving `task-description-dialog`.

- [ ] **Step 3: Implement the focused component**

Create a controlled summary button and nested dialog with local `draft` state. Close without saving on Cancel/Escape; only call `onSave(draft.trim())` from the save action.

- [ ] **Step 4: Integrate into both creation and edit views**

Replace direct task-description textareas in `App.tsx` with:

```tsx
<TaskDescriptionDialog value={description} onSave={setDescription} />
```

Keep notes as a textarea and apply `resize: none` to modal textareas. Add an app test proving the task title/step editor remains usable after saving a description.

- [ ] **Step 5: Run component and app tests**

Run: `npm test -- --run src/L1-ui/features/tasks/task-description-dialog.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/L1-ui/features/tasks/task-description-dialog.tsx src/L1-ui/features/tasks/task-description-dialog.test.tsx src/App.tsx src/App.test.tsx src/index.css
git commit -m "feat: edit task descriptions in a dialog"
```

### Task 3: Double-click duration editing and clean analysis status

**Files:**
- Modify: `src/L1-ui/features/tasks/analysis-step-editor.tsx`
- Modify: `src/L1-ui/features/tasks/analysis-step-editor.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Replace dropdown expectations with failing double-click tests**

Assert that the default view has no combobox/spinbutton, displays `6.25 小时`, opens a textbox on double-click, rounds `6.4` to `6.5`, commits on Enter, and cancels on Escape.

```tsx
fireEvent.doubleClick(screen.getByRole("button", { name: "修改步骤 1 时长" }));
fireEvent.change(screen.getByLabelText("步骤 1 时长"), { target: { value: "6.4" } });
fireEvent.keyDown(screen.getByLabelText("步骤 1 时长"), { key: "Enter" });
expect(onChange.mock.calls.at(-1)?.[0][0].hours).toBe(6.5);
```

- [ ] **Step 2: Run the focused test and observe the dropdown mismatch**

Run: `npm test -- --run src/L1-ui/features/tasks/analysis-step-editor.test.tsx`

Expected: FAIL because a select is rendered and double-click editing is absent.

- [ ] **Step 3: Implement an inline `StepDurationEditor`**

Use local `editing`, `draft`, and `invalid` state. Render a button in display mode; render `type="text" inputMode="decimal"` while editing. Save through `normalizeHours(Number(draft))`; invalid values preserve the original duration.

- [ ] **Step 4: Remove fallback analysis copy**

In `App.tsx`, render the total/priority summary only when `analysis` exists. Render `.ai-message` only when `analysisError` is non-empty. Do not render “手动分析模式” or “未配置 AI”.

- [ ] **Step 5: Add CSS for editing and error states**

Give the display button the same dimensions as the former select. Remove select styling, browser number-spinner rules, and ensure `.modal textarea { resize: none; }`.

- [ ] **Step 6: Run focused and app tests**

Run: `npm test -- --run src/L1-ui/features/tasks/analysis-step-editor.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/L1-ui/features/tasks/analysis-step-editor.tsx src/L1-ui/features/tasks/analysis-step-editor.test.tsx src/App.tsx src/App.test.tsx src/index.css
git commit -m "feat: edit step hours on double click"
```

### Task 4: Drag-to-reorder steps and final verification

**Files:**
- Modify: `src/L1-ui/features/tasks/analysis-step-editor.tsx`
- Modify: `src/L1-ui/features/tasks/analysis-step-editor.test.tsx`
- Modify: `src/index.css`
- Modify: `PROJECT.md`

- [ ] **Step 1: Write a failing reorder test**

Render three steps, drag the handle for step 1 over step 3, fire drop, and assert `onChange` receives IDs in `["2", "3", "1"]` order while retaining every object’s title, hours, and completed state.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run src/L1-ui/features/tasks/analysis-step-editor.test.tsx`

Expected: FAIL because handles do not currently reorder.

- [ ] **Step 3: Implement native drag state**

Track `draggedId` and `dropTargetId`. Make only the handle draggable; on drag-over prevent default, on drop remove the dragged step and insert it after the target step. Clear drag state on drop and drag-end.

- [ ] **Step 4: Add drag affordance styles**

Use `.dragging` for reduced opacity and `.drop-target` for an accent border. Apply `cursor: grab`/`grabbing` to the handle and keep title/time controls clickable.

- [ ] **Step 5: Update project documentation**

Document that task descriptions use a nested dialog, step duration uses double-click quarter-hour editing, and desktop step ordering uses the drag handle.

- [ ] **Step 6: Run the full quality gate**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: 0 failed tests and exit code 0 from every command.

- [ ] **Step 7: Commit**

```bash
git add src/L1-ui/features/tasks/analysis-step-editor.tsx src/L1-ui/features/tasks/analysis-step-editor.test.tsx src/index.css PROJECT.md
git commit -m "feat: reorder task steps by dragging"
```
