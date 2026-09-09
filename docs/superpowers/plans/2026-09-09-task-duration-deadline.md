# 任务时间长度与截止日期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在任务编辑中同时输入预计用时与截止日期，并让 AI 分析和任务数据使用两项约束。

**Architecture:** 扩展任务模型的可选 `deadline` 字段；App 分别维护 `durationHint` 与 `deadline`。分析请求把两项提交给 API，任务卡显示截止日期。

**Tech Stack:** React、TypeScript、Vitest。

---

### Task 1: 任务数据与分析请求

**Files:**

- Modify: `src/L4-data/task-model.ts`
- Modify: `src/L1-ui/features/tasks/analyze-task.ts`
- Modify: `src/L1-ui/features/tasks/analyze-task.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
it("sends a deadline alongside duration to analysis", async () => {
  await analyzeTask({ title: "报告", description: "", duration: "20 天", deadline: "2026-10-01", notes: "", minSteps: 2, maxSteps: 4 });
  expect(fetch).toHaveBeenCalledWith("/api/analyze-task", expect.objectContaining({ body: expect.stringContaining("2026-10-01") }));
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/L1-ui/features/tasks/analyze-task.test.ts --run`

Expected: FAIL，输入类型没有 `deadline`。

- [ ] **Step 3: 实现字段传递**

在 `Task` 添加可选 `deadline?: string`；`analyzeTask` 输入添加 deadline 并序列化到请求体。服务端分析提示加入“截止日期：无/ISO 日期”，要求步骤计划符合期限。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- src/L1-ui/features/tasks/analyze-task.test.ts src/L4-data/task-model.test.ts --run && npm run typecheck`

Expected: PASS。

Run: `git add src/L4-data/task-model.ts src/L1-ui/features/tasks/analyze-task.ts src/L1-ui/features/tasks/analyze-task.test.ts server/ai-routes.ts && git commit -m "feat: include task deadlines in analysis"`

### Task 2: 双输入界面和任务展示

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 写失败 UI 测试**

```tsx
it("edits and displays a task deadline", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "新建任务" }));
  fireEvent.change(screen.getByLabelText("截止日期"), { target: { value: "2026-10-01" } });
  expect(screen.getByLabelText("时间长度")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL，缺少截止日期输入。

- [ ] **Step 3: 实现界面与保存**

把当前单一时间长度 label 改为 `.task-time-fields`，包含 `时间长度` 文本输入及 `截止日期` 的 `type="date"` 输入。打开编辑任务时回填 deadline；保存时写入 deadline；AI 分析调用带 deadline。存在 deadline 的任务卡显示“截止：YYYY-MM-DD”。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- src/App.test.tsx --run && npm run build`

Expected: PASS。

Run: `git add src/App.tsx src/App.test.tsx src/index.css && git commit -m "feat: add duration and deadline task fields"`
