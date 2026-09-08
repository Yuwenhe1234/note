# 左上角待办提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把待办提醒显示为不阻塞页面的左上角卡片。

**Architecture:** 保留 `App.tsx` 中的提醒队列和 `todo-reminder-scheduler` 不变，只替换提醒容器的 CSS 定位和尺寸。组件测试验证卡片没有全屏遮罩，且队列确认行为仍存在。

**Tech Stack:** React、TypeScript、CSS、Vitest、Testing Library。

---

### Task 1: 调整提醒卡片样式并验证

**Files:**

- Modify: `src/index.css:669-673`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: 写入失败的表现测试**

```tsx
it("renders a due reminder as a non-blocking top-left card", async () => {
  // 复用现有 09:01 待办、fake timers 和渲染步骤触发提醒。
  const card = screen.getByRole("heading", { name: "待办提醒" }).closest("section")!;
  const container = card.parentElement!;
  expect(container).toHaveClass("reminder-toast");
  expect(getComputedStyle(container).inset).not.toBe("0px");
  expect(getComputedStyle(container).backgroundColor).toBe("transparent");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL，现有容器类名为 `reminder-overlay`，并覆盖整个视口。

- [ ] **Step 3: 用非阻塞卡片容器替换遮罩**

在 `src/App.tsx` 中把提醒最外层类名从 `reminder-overlay` 改为 `reminder-toast`。在 `src/index.css` 以以下规则替换 `.reminder-overlay`：

```css
.reminder-toast { position: fixed; top: 24px; left: 24px; z-index: 130; width: min(360px, calc(100vw - 48px)); pointer-events: none; }
.reminder-toast .reminder-dialog { pointer-events: auto; padding: 22px; border: 1px solid #a9ffbd55; border-radius: 18px; background: #111216; box-shadow: 0 18px 46px #0009; }
.reminder-toast .reminder-dialog h2 { margin: 7px 0 12px; font: 400 32px "Instrument Serif"; }
.reminder-toast .reminder-dialog p { margin: 0 0 6px; color: #f4f4f4; font-size: 16px; }
```

删除 `.reminder-overlay` 的 `inset`、背景和 `backdrop-filter` 样式；保留按钮样式及提醒对话框中的 `small` 文字颜色。

- [ ] **Step 4: 运行提醒回归测试和类型检查**

Run: `npm test -- src/App.test.tsx src/L5-services/todo-reminder-scheduler.test.ts --run && npm run typecheck`

Expected: PASS，30 项提醒与应用测试通过，TypeScript 无错误。

- [ ] **Step 5: 提交卡片布局**

Run: `git add src/App.tsx src/App.test.tsx src/index.css && git commit -m "feat: show todo reminder at top left"`

Expected: 提醒表现变更独立提交。

### Task 2: 生产构建验证

**Files:**

- No source changes.

- [ ] **Step 1: 构建生产包**

Run: `npm run build`

Expected: PASS，TypeScript 构建和 Vite 生产包生成成功。
