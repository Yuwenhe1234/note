# 设置功能完整性修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让设置实时生效，补齐任务优先级与可见设置的实际行为和反馈。

**Architecture:** `SettingsCenter` 通过保存回调让 `App` 重算当前列表；任务优先级成为独立可编辑状态。提醒调度器接收提醒设置，数据与诊断操作统一显示结果。

**Tech Stack:** React、TypeScript、Vitest、Testing Library。

---

### Task 1: 设置刷新和任务优先级

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
it("updates the visible task list immediately after changing sort settings", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "设置" }));
  fireEvent.click(screen.getByRole("button", { name: "任务默认值" }));
  fireEvent.change(screen.getByLabelText("默认排序"), { target: { value: "priority" } });
  fireEvent.click(screen.getByRole("button", { name: "任务清单" }));
  expect(screen.getAllByRole("article")[0]).toHaveTextContent("完成 React 界面迁移");
});
```

增加优先级测试：新建任务使用默认优先级；编辑任务可选优先级；任务卡显示“高/中/低优先级”。

- [ ] **Step 2: 验证失败**

Run: `npm test -- src/App.test.tsx src/L1-ui/features/settings/settings-center.test.tsx --run`

Expected: FAIL，设置变更没有触发 App 重算，任务卡没有优先级标签。

- [ ] **Step 3: 实现最小变更**

给 `SettingsCenter` 增加 `onSettingsSaved` 回调，在 `saveSettings` 后调用；App 用递增 revision 订阅回调，并让列表计算依赖 revision。新增 `taskPriority` 状态，创建时读取默认值、编辑时读取任务值、AI 分析后采用返回值；保存任务时写入 priority。任务卡渲染中文优先级标签。最少/最多步骤互相校正，默认项旁标记“仅影响新任务”。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- src/App.test.tsx src/L1-ui/features/settings/settings-center.test.tsx --run && npm run typecheck`

Expected: PASS。

Run: `git add src/App.tsx src/App.test.tsx src/L1-ui/features/settings/settings-center.tsx src/L1-ui/features/settings/settings-center.test.tsx && git commit -m "fix: apply settings immediately and expose task priority"`

### Task 2: 提醒设置和操作反馈

**Files:**

- Modify: `src/L5-services/todo-reminder-scheduler.ts`
- Modify: `src/L5-services/todo-reminder-scheduler.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.test.tsx`

- [ ] **Step 1: 写失败测试**

```ts
it("schedules a todo before its configured reminder time", () => {
  const scheduler = createTodoReminderScheduler(deps);
  scheduler.sync([todoAt0900], { leadMinutes: 15, overdueReminder: false });
  vi.advanceTimersByTime(45 * 60_000);
  expect(listener).toHaveBeenCalledOnce();
});
```

增加数据清理、重置和复制诊断后的成功状态文本测试。

- [ ] **Step 2: 验证失败**

Run: `npm test -- src/L5-services/todo-reminder-scheduler.test.ts src/L1-ui/features/settings/settings-center.test.tsx --run`

Expected: FAIL，调度器不接收提醒配置，操作无结果反馈。

- [ ] **Step 3: 实现最小变更**

调度器 `sync` 接收 `{ leadMinutes, overdueReminder }`；提前分钟从目标时间扣除，逾期仅在开启时当天首次补发一次。App 同步时传入 `loadSettings().reminders`。DataPanel 在导入、清理、重置后展示状态；DiagnosticsPanel 在剪贴板成功或失败后展示状态。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- src/L5-services/todo-reminder-scheduler.test.ts src/L1-ui/features/settings/settings-center.test.tsx src/App.test.tsx --run && npm run build`

Expected: PASS。

Run: `git add src/L5-services/todo-reminder-scheduler.ts src/L5-services/todo-reminder-scheduler.test.ts src/App.tsx src/L1-ui/features/settings/settings-center.tsx src/L1-ui/features/settings/settings-center.test.tsx && git commit -m "feat: apply reminder settings and action feedback"`
