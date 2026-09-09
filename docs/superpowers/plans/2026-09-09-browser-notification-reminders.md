# 浏览器通知提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 授权后向浏览器发送待办系统通知，未授权时安全回退为网页左上角提醒。

**Architecture:** 复用 `browserReminderService` 统一权限与通知操作；`App` 的已有待办调度在到点时根据保存的 `settings.reminders.notifications` 决定是否发送通知。设置面板准确展示授权、拒绝和不支持状态。

**Tech Stack:** React、TypeScript、Vitest、Web Notification API。

---

### Task 1: 权限状态与到点系统通知

**Files:**

- Modify: `src/L5-services/reminder-service.ts`
- Modify: `src/L5-services/reminder-service.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: 写入失败测试**

```ts
it("does not request again when notification permission is already granted", async () => {
  const requestPermission = vi.fn();
  const service = createReminderService({ permission: () => "granted", requestPermission, notify: vi.fn(), now: Date.now, setTimer: setTimeout, clearTimer: clearTimeout });
  expect(await service.enable()).toBe(true);
  expect(requestPermission).not.toHaveBeenCalled();
});
```

在 `App.test.tsx` 添加到点测试：通知开关为 true、`Notification.permission = "granted"` 时，提醒卡片出现且 `new Notification` 收到待办标题；开关为 false 或权限不是 granted 时不调用通知。

- [ ] **Step 2: 验证失败测试**

Run: `npm test -- src/L5-services/reminder-service.test.ts src/App.test.tsx --run`

Expected: FAIL，当前 App 不会基于已保存开关发送通知。

- [ ] **Step 3: 实现开关控制的通知发送**

在 `App.tsx` 到点订阅中读取 `loadSettings().reminders.notifications`；仅当它为 true 且 `browserReminderService.test()` 可发送时调用通知。通知标题为 `待办提醒：${todo.content}`，正文为 `设定时间：${todo.reminderTime}`；无论通知结果如何都保持网页 toast 与 FIFO 队列。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- src/L5-services/reminder-service.test.ts src/App.test.tsx src/L5-services/todo-reminder-scheduler.test.ts --run && npm run typecheck`

Expected: PASS。

Run: `git add src/L5-services/reminder-service.ts src/L5-services/reminder-service.test.ts src/App.tsx src/App.test.tsx && git commit -m "feat: send enabled browser reminder notifications"`

### Task 2: 设置开关的拒绝恢复说明

**Files:**

- Modify: `src/L1-ui/features/settings/settings-center.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.test.tsx`

- [ ] **Step 1: 写入失败 UI 测试**

```tsx
it("explains how to restore a denied browser notification permission", () => {
  Object.defineProperty(Notification, "permission", { configurable: true, value: "denied" });
  render(<SettingsCenter onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "提醒方式" }));
  expect(screen.getByText(/地址栏.*站点权限.*允许/)).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/L1-ui/features/settings/settings-center.test.tsx --run`

Expected: FAIL，拒绝状态没有恢复指引。

- [ ] **Step 3: 实现恢复指引**

在 `ReminderPanel` 权限为 `denied` 时展示“浏览器已拒绝通知。请在地址栏的网站权限中将通知改为允许，然后重新开启此开关。”；API 不存在时继续展示不支持说明。仅 `default` 状态的开启操作调用 `enable()`；已授权不会再次请求。

- [ ] **Step 4: 验证与提交**

Run: `npm test -- src/L1-ui/features/settings/settings-center.test.tsx --run && npm run build`

Expected: PASS。

Run: `git add src/L1-ui/features/settings/settings-center.tsx src/L1-ui/features/settings/settings-center.test.tsx && git commit -m "feat: explain browser notification permission recovery"`
