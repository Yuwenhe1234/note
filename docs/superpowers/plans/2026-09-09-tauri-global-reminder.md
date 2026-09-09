# Tauri 跨应用提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让安装后的 Windows EXE 在系统托盘常驻，并通过左上角原生提醒窗跨应用显示今日待办提醒。

**Architecture:** Rust 层保存当天已触发 ID、轮询本地工作区并向隐藏的 `desktop-reminder` WebView 发事件。提醒窗口前端显示一个紧凑卡片并调用确认命令；托盘负责隐藏主窗和显式退出。网页提醒及小组件不改动。

**Tech Stack:** Tauri 2、Rust、React、TypeScript、Vitest、Cargo test。

---

### Task 1: 原生提醒调度与确认队列

**Files:**

- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/lib.rs`

- [ ] **Step 1: 写入 Rust 失败测试**

```rust
#[test]
fn queues_due_uncompleted_todos_once_per_day() {
  let todos = serde_json::json!([
    {"id":"a","content":"喝水","reminderTime":"09:00","completed":false},
    {"id":"b","content":"已完成","reminderTime":"09:00","completed":true}
  ]);
  let mut triggered = std::collections::HashSet::new();
  assert_eq!(due_reminders(&todos, "09:00", &mut triggered).len(), 1);
  assert!(due_reminders(&todos, "09:00", &mut triggered).is_empty());
}
```

- [ ] **Step 2: 运行失败测试**

Run: `cargo test queues_due_uncompleted_todos_once_per_day`

Expected: FAIL，`due_reminders` 尚未定义。

- [ ] **Step 3: 实现最小调度器**

在 `lib.rs` 添加 `ReminderTodo { id, content, reminder_time }`、`due_reminders(todos, current_hhmm, triggered)` 和 `ReminderState { queue, triggered_ids }`。每 30 秒读取 `current_workspace_path`，筛选 `completed != true` 且合法 `reminderTime == HH:mm` 的项目，按数组顺序压入队列；用当天 ID 去重。通过 `desktop-reminder` 窗口事件 `todo-reminder` 发出首项，新增 `acknowledge_desktop_reminder` 命令：从队列取下一项并继续 emit，无下一项时隐藏窗口。

- [ ] **Step 4: 验证 Rust 测试**

Run: `cargo test`

Expected: PASS，新增队列/去重测试与现有 Rust 测试通过。

- [ ] **Step 5: 提交**

Run: `git add src-tauri/src/lib.rs && git commit -m "feat: schedule native desktop reminders"`

### Task 2: 提醒窗口和前端确认卡片

**Files:**

- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src/main.tsx`
- Create: `src/L1-ui/features/reminders/desktop-reminder-window.tsx`
- Create: `src/L1-ui/features/reminders/desktop-reminder-window.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 写入失败组件测试**

```tsx
it("shows native reminder content and acknowledges it", async () => {
  render(<DesktopReminderWindow reminder={{ id: "a", content: "喝水", reminderTime: "09:00" }} onAcknowledge={acknowledge} />);
  expect(screen.getByText("喝水")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /我知道了/ }));
  expect(acknowledge).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/L1-ui/features/reminders/desktop-reminder-window.test.tsx --run`

Expected: FAIL，组件模块不存在。

- [ ] **Step 3: 添加原生窗口和卡片**

在 `tauri.conf.json` 增加隐藏窗口 `desktop-reminder`：360×190、无边框、透明、alwaysOnTop、skipTaskbar、focusable false。Rust 在显示前定位主显示器 `(24px, 24px)`。在 `main.tsx` 识别该 label 并渲染 `DesktopReminderWindow`；该组件监听 `todo-reminder`，显示深色紧凑卡片并用 `invoke("acknowledge_desktop_reminder")` 确认。添加只作用于 `.desktop-reminder-window` 的样式。

- [ ] **Step 4: 验证前端**

Run: `npm test -- src/L1-ui/features/reminders/desktop-reminder-window.test.tsx --run && npm run typecheck`

Expected: PASS，组件测试通过且 TypeScript 无错误。

- [ ] **Step 5: 提交**

Run: `git add src-tauri/tauri.conf.json src-tauri/capabilities/default.json src/main.tsx src/L1-ui/features/reminders src/index.css && git commit -m "feat: add native desktop reminder window"`

### Task 3: 托盘常驻与生命周期

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 写入关闭行为失败测试**

```rust
#[test]
fn close_action_hides_main_instead_of_exiting() {
  assert_eq!(close_action_for_main_window(), CloseAction::Hide);
}
```

- [ ] **Step 2: 运行失败测试**

Run: `cargo test close_action_hides_main_instead_of_exiting`

Expected: FAIL，关闭策略不存在。

- [ ] **Step 3: 实现托盘与退出策略**

添加 `tauri-plugin-tray` 依赖；在 builder 注册带“打开主窗口”“退出应用”的托盘菜单。监听 main 的 close-request，调用 `prevent_close()` 后隐藏窗口；“打开”显示并聚焦 main，“退出”调用 `app.exit(0)`。提醒窗口关闭时直接隐藏而不退出。

- [ ] **Step 4: 运行原生和前端验证**

Run: `cargo test && npm test -- src/App.test.tsx src/L5-services/todo-reminder-scheduler.test.ts --run && npm run build`

Expected: PASS，原生测试、提醒回归测试和生产构建均通过。

- [ ] **Step 5: 手动验收 EXE**

Run: `npm run tauri dev`

Expected: 关闭主窗后托盘仍在；托盘可打开或退出；添加未来一分钟待办后切到浏览器，到点看到左上角原生卡片。

- [ ] **Step 6: 提交**

Run: `git add src-tauri/Cargo.toml src-tauri/src/lib.rs && git commit -m "feat: keep desktop reminders running in tray"`
