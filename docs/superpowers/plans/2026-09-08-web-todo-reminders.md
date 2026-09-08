# 网页今日待办提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让今日待办在指定时间以应用内弹窗提醒，并公开可由 AI 陪伴订阅的提醒事件接口。

**Architecture:** 将今日待办计时和事件发布从 `App.tsx` 提取至 `todo-reminder-scheduler`。`App` 同步未完成待办、把事件排成 FIFO 并渲染现有弹窗；未来 AI 陪伴仅订阅同一事件。

**Tech Stack:** React、TypeScript、Vitest、Testing Library、浏览器 `setTimeout`。

---

## File structure

- Create: `src/L5-services/todo-reminder-scheduler.ts` — 可订阅提醒事件、当天未来时间计算和计时器管理。
- Create: `src/L5-services/todo-reminder-scheduler.test.ts` — 服务级调度、取消、过期、订阅测试。
- Modify: `src/App.tsx:1-190,773` — 移除系统通知，订阅服务并显示队列中的网页提醒。
- Modify: `src/App.test.tsx` — 网页弹窗及不调用系统通知的集成测试。
- Modify: `README.md:19,81` — 描述网页内提醒及 AI 扩展边界。

### Task 1: 建立可订阅的今日待办提醒调度器

**Files:**

- Create: `src/L5-services/todo-reminder-scheduler.ts`
- Test: `src/L5-services/todo-reminder-scheduler.test.ts`

- [ ] **Step 1: 写入失败的服务测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { createTodoReminderScheduler } from "./todo-reminder-scheduler";

describe("todo reminder scheduler", () => {
  it("publishes one due todo once", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const scheduler = createTodoReminderScheduler({ now: () => new Date("2026-09-08T09:00:00").getTime(), setTimer: setTimeout, clearTimer: clearTimeout });
    scheduler.subscribe(listener);
    scheduler.sync([{ id: "t1", content: "写周报", reminderTime: "09:01", completed: false }]);
    vi.advanceTimersByTime(60_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].todo.content).toBe("写周报");
    vi.useRealTimers();
  });

  it("clears replaced todos and skips completed, past, or invalid todos", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const scheduler = createTodoReminderScheduler({ now: () => new Date("2026-09-08T09:00:00").getTime(), setTimer: setTimeout, clearTimer: clearTimeout });
    scheduler.subscribe(listener);
    scheduler.sync([{ id: "t1", content: "旧", reminderTime: "09:01", completed: false }]);
    scheduler.sync([{ id: "t1", content: "新", reminderTime: "09:02", completed: false }, { id: "done", content: "完成", reminderTime: "09:01", completed: true }, { id: "past", content: "过去", reminderTime: "08:59", completed: false }, { id: "bad", content: "错误", reminderTime: "bad", completed: false }]);
    vi.advanceTimersByTime(120_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].todo.content).toBe("新");
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/L5-services/todo-reminder-scheduler.test.ts --run`

Expected: FAIL，缺少 `./todo-reminder-scheduler` 模块。

- [ ] **Step 3: 实现调度和订阅端口**

```ts
export type TodayReminderTodo = { id: string; content: string; reminderTime: string; completed: boolean };
export type TodoReminderEvent = { todo: TodayReminderTodo; scheduledForMs: number; triggeredAtMs: number };
type Dependencies = { now: () => number; setTimer: typeof setTimeout; clearTimer: typeof clearTimeout };

export function createTodoReminderScheduler(dependencies: Dependencies) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const listeners = new Set<(event: TodoReminderEvent) => void>();
  const dispose = () => { timers.forEach((timer) => dependencies.clearTimer(timer)); timers.clear(); };
  const subscribe = (listener: (event: TodoReminderEvent) => void) => { listeners.add(listener); return () => listeners.delete(listener); };
  const sync = (todos: TodayReminderTodo[]) => {
    dispose();
    todos.filter((todo) => !todo.completed).forEach((todo) => {
      const parts = /^(\\d{2}):(\\d{2})$/.exec(todo.reminderTime);
      if (!parts) return;
      const scheduled = new Date(dependencies.now());
      scheduled.setHours(Number(parts[1]), Number(parts[2]), 0, 0);
      const delay = scheduled.getTime() - dependencies.now();
      if (delay <= 0) return;
      timers.set(todo.id, dependencies.setTimer(() => {
        timers.delete(todo.id);
        const event = { todo, scheduledForMs: scheduled.getTime(), triggeredAtMs: dependencies.now() };
        listeners.forEach((listener) => listener(event));
      }, delay));
    });
  };
  return { sync, subscribe, dispose };
}
```

- [ ] **Step 4: 验证服务实现**

Run: `npm test -- src/L5-services/todo-reminder-scheduler.test.ts --run`

Expected: PASS，2 个测试通过。

- [ ] **Step 5: 提交服务**

Run: `git add src/L5-services/todo-reminder-scheduler.ts src/L5-services/todo-reminder-scheduler.test.ts && git commit -m "feat: add web todo reminder scheduler"`

Expected: 创建独立的可订阅提醒服务提交。

### Task 2: 接入网页提醒弹窗队列

**Files:**

- Modify: `src/App.tsx:1-190,773`
- Test: `src/App.test.tsx`

- [ ] **Step 1: 写入失败的 App 集成测试**

```tsx
it("shows due todos in an in-page dialog without creating a browser notification", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-08T09:00:00"));
  const notification = vi.fn();
  Object.defineProperty(window, "Notification", { configurable: true, value: notification });
  localStorage.setItem("memo-agent-today-todos", JSON.stringify([
    { id: "drink", content: "喝水", reminderTime: "09:01", completed: false },
  ]));
  render(<App />);
  act(() => vi.advanceTimersByTime(60_000));
  expect(await screen.findByRole("heading", { name: "待办提醒" })).toBeInTheDocument();
  expect(screen.getByText("喝水")).toBeInTheDocument();
  expect(notification).not.toHaveBeenCalled();
  vi.useRealTimers();
});
```

增加第二个测试：使用两个同一未来时间的待办，断言先显示第一项；点击“我知道了”后显示第二项；第二次确认后弹窗消失。

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL，当前实现会直接调用 `new Notification(...)`，且没有待提醒队列。

- [ ] **Step 3: 替换 App 的内嵌提醒计时器**

在 `App.tsx` 导入 `createTodoReminderScheduler`；用 `useRef` 创建唯一调度器，并增加 `reminderQueueRef`。挂载时 `subscribe`：没有活动提醒时设置 `activeReminder`，否则把 `event.todo` 压入队列；卸载时取消订阅并 `dispose()`。以 `scheduler.sync(todayTodos)` 替换现有 `todayTodos` effect，完全删除 `Notification` 判断和 `new Notification`。将“我知道了”的点击处理改为 `setActiveReminder(reminderQueueRef.current.shift() || null)`。

- [ ] **Step 4: 验证集成和类型**

Run: `npm test -- src/App.test.tsx src/L5-services/todo-reminder-scheduler.test.ts --run && npm run typecheck`

Expected: PASS，指定测试通过，且 TypeScript 无错误。

- [ ] **Step 5: 提交页面接入**

Run: `git add src/App.tsx src/App.test.tsx && git commit -m "feat: show todo reminders in the web app"`

Expected: 网页提醒已成为唯一的今日待办提醒通道。

### Task 3: 文档和完整验证

**Files:**

- Modify: `README.md:19,81,181`

- [ ] **Step 1: 更新说明文字**

把 README 内“定时提醒(浏览器通知)”和架构中的“浏览器通知”改为“定时网页提醒（网页打开时）”，补充一句“AI 陪伴后续可订阅提醒事件，当前不提供 AI 陪伴提醒”。

- [ ] **Step 2: 完整验证**

Run: `npm test -- --run && npm run build`

Expected: PASS，全部 Vitest 测试和生产构建成功。

- [ ] **Step 3: 手动验收**

Run: `npm run dev`

Expected: 添加一个未来一分钟的今日待办；到点显示“待办提醒”弹窗；确认不自动完成任务；没有系统通知权限请求。

- [ ] **Step 4: 提交说明更新**

Run: `git add README.md && git commit -m "docs: describe web todo reminders"`

Expected: 用户文档反映网页提醒和 AI 扩展端口。
