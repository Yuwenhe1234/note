# Category-Aware AI Task Analysis V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AI task analysis from generic Todo generation to category-specific, validated task-detail generation with flowcharts, structured goals, resource suggestions, and concrete risks.

**Architecture:** Keep the existing `/api/analyze-task` server route and browser AI fallback as the shared analysis boundary. Extract category rules and JSON-output requirements into prompt/schema modules; normalize the validated response into backward-compatible task-model fields when creating a task. Extend the detail page with compact, editable renderers for structured goal criteria, flowchart-derived mind map, resource records, and note records.

**Tech Stack:** React, TypeScript, Vitest, Vite, Node HTTP route, `@xyflow/react`.

---

## File structure

- Create: `server/task-analysis-contract.ts` — shared category constants, analysis/result types, and pure normalizers used by prompt, schema, and client.
- Create: `server/task-analysis-workflows.ts` — category method descriptions and non-generic step constraints consumed by the prompt builder.
- Modify: `server/task-analysis-prompt.ts` — compose the strict category-aware prompt and correction prompt.
- Modify: `server/analysis-schema.ts` — validate all required analysis fields, exact duration, flowchart references, notes and resources.
- Modify: `server/ai-routes.ts` — include parser failure reason in retry prompt.
- Modify: `src/L1-ui/features/tasks/analyze-task.ts` — consume the shared analysis contract instead of a duplicate type.
- Modify: `src/L5-services/browser-ai-client.ts` — retain the shared contract in browser fallback parsing.
- Modify: `src/L4-data/task-model.ts` — add backwards-compatible structured goal, flowchart, resource records, and note records to `Task`; migrate legacy data.
- Modify: `src/App.tsx` — map validated analysis fields into a new/edited task and derive `mindMap` from the flowchart.
- Modify: `src/L1-ui/features/tasks/task-detail-page.tsx` — render/edit structured completion criteria, typed resource suggestions, note cards, and use flowchart data for the existing map.
- Modify: `src/index.css` — only add scoped styles needed for the new task-detail fields.
- Modify tests: `server/task-analysis-prompt.test.ts`, `server/analysis-schema.test.ts`, `src/L4-data/task-model.test.ts`, `src/L1-ui/features/tasks/task-detail-page.test.tsx`, and task-creation integration tests in `src/App.test.tsx` if present.

### Task 1: Establish the shared analysis contract

**Files:**
- Create: `server/task-analysis-contract.ts`
- Test: `server/analysis-schema.test.ts`

- [ ] Define `TaskCategory`, `StructuredGoal`, `Flowchart`, `AnalysisResource`, `AnalysisNote`, `AnalysisStep`, and `TaskAnalysisResult`.

```ts
export const TASK_CATEGORIES = ["学习类", "开发/项目类", "写作/内容类", "规划/准备类", "生活/习惯类"] as const;
export type TaskCategory = typeof TASK_CATEGORIES[number];
export type StructuredGoal = { description: string; completionCriteria: string[] };
export type Flowchart = { nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] };
export type AnalysisResource = { name: string; platform: string; url: string; searchQuery: string; reason: string; stage: string };
export type AnalysisNote = { title: string; description: string; level: "important" | "warning" | "risk" };
```

- [ ] Add a parser test fixture that includes each required field and all five types; run `npm test -- server/analysis-schema.test.ts` and confirm it fails before parser work.
- [ ] Commit with `git add server/task-analysis-contract.ts server/analysis-schema.test.ts && git commit -m "feat: define task analysis contract"`.

### Task 2: Split category workflows from the prompt builder

**Files:**
- Create: `server/task-analysis-workflows.ts`
- Modify: `server/task-analysis-prompt.ts`
- Test: `server/task-analysis-prompt.test.ts`

- [ ] Define each category workflow, its required flowchart semantics, and its anti-generic-step rule in `task-analysis-workflows.ts`.
- [ ] Rewrite `buildTaskAnalysisMessages` to require the contract JSON, direct use of title/description/notes, 0.25-hour steps, exact budget equality, 5–10 concrete steps, 10 core questions, and safe resource output (`url: ""` plus `searchQuery` without verified search).
- [ ] Include retry context as a `validationError` argument, rather than only a generic retry boolean.

```ts
export function buildTaskAnalysisMessages(input: TaskAnalysisPromptInput, correction?: string): TaskAnalysisMessage[];
```

- [ ] Assert prompt tests contain the full contract keys, each category’s method, no fabricated-URL rule, and correction context.
- [ ] Run `npm test -- server/task-analysis-prompt.test.ts` and commit `feat: require category-specific AI task analysis`.

### Task 3: Strict parse and correction retry

**Files:**
- Modify: `server/analysis-schema.ts`
- Modify: `server/ai-routes.ts`
- Modify: `src/L5-services/browser-ai-client.ts`
- Test: `server/analysis-schema.test.ts`

- [ ] Validate category membership, structured goal text/criteria, domain-map arrays, 10 core questions, resource record fields, note levels, non-empty step action/description/completion criteria, flowchart node IDs, and edge references.
- [ ] Reject generic step titles using a bounded deny-list (`查资料`, `开始学习`, `整理知识`, `核心功能开发`) only when they are the whole title, while allowing task-specific titles containing those words.
- [ ] Reject invalid URL values unless empty or HTTP(S); reject an empty `url` without a `searchQuery`.
- [ ] Preserve exact total validation: all step hours must be quarter hours and their sum must equal `estimatedHours`.
- [ ] Have the server catch `parseAnalysis` errors and pass the exact error message to the next `buildTaskAnalysisMessages` retry.
- [ ] Have browser fallback use the same parser and surface its error unchanged.
- [ ] Add acceptance/rejection tests, then run `npm test -- server/analysis-schema.test.ts server/task-analysis-prompt.test.ts`.
- [ ] Commit `feat: validate complete task analysis payloads`.

### Task 4: Backward-compatible task persistence and creation mapping

**Files:**
- Modify: `src/L4-data/task-model.ts`
- Modify: `src/L1-ui/features/tasks/analyze-task.ts`
- Modify: `src/App.tsx`
- Test: `src/L4-data/task-model.test.ts`

- [ ] Add optional persisted fields to `Task`: `summary`, `structuredGoal`, `flowchart`, typed `resources`, and typed `notes`.
- [ ] Keep legacy `goal`, `domainMap`, `mindMap`, and string resource arrays readable; `migrateTask` must derive safe empty structured fields when absent.
- [ ] Convert `flowchart` to the existing `TaskMindMap` positions deterministically when a new task is created, without replacing an existing user-edited `mindMap` during migration.
- [ ] Map new analysis result fields in `App.tsx`; flatten `structuredGoal.description` into legacy `goal/objective` only for old consumers.
- [ ] Test old task migration, analysis-to-task flowchart conversion, and exact persisted step durations.
- [ ] Run `npm test -- src/L4-data/task-model.test.ts` and commit `feat: persist rich task analysis details`.

### Task 5: Minimal detail-page rendering and editing

**Files:**
- Modify: `src/L1-ui/features/tasks/task-detail-page.tsx`
- Modify: `src/index.css`
- Test: `src/L1-ui/features/tasks/task-detail-page.test.tsx`

- [ ] Keep the existing page geometry. Add compact completion-criteria chips/editor under the existing objective, typed note cards in the current notes panel, and resource records in the existing resources panel.
- [ ] Render a resource as a link only for HTTP(S) `url`; otherwise show `platform`, `name`, `reason`, and `searchQuery` as an editable suggestion.
- [ ] Bind the existing mind map to `flowchart`-derived data for new analyses and preserve user node drag/edit changes through the existing `mindMap` state.
- [ ] Render core questions from the analysis in the existing right-side task context without expanding the page layout beyond its existing scroll regions.
- [ ] Add tests for criteria, search-query resources, notes, flowchart-backed map, and save behavior.
- [ ] Run `npm test -- src/L1-ui/features/tasks/task-detail-page.test.tsx` and commit `feat: render rich AI task analysis details`.

### Task 6: Full verification

**Files:**
- Modify only files required by failures.

- [ ] Run `npm test` and fix all regressions.
- [ ] Run `npm run build`; expected result: TypeScript build and Vite production build succeed.
- [ ] Manually verify one task from each category with an exact duration budget, one legacy task, no-URL resources, and a detail-page save/reload.
- [ ] Commit any verification fixes with a narrowly scoped message.

## Self-review

- Coverage: Tasks 1–3 cover Prompt, JSON contract, parser and retry; Task 4 covers types and legacy migration; Task 5 covers detail rendering; Task 6 covers validation.
- Resource search remains deferred by design: all unverified URLs stay empty and use `searchQuery`.
- The plan keeps the current UI shell and map/editor components rather than redesigning the task-detail page.
