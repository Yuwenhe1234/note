# 桌面组件（第一阶段）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成“其他功能 → 放入桌面”的网页配置页与交互式预览，配置随工作区按账户持久化；原生 Tauri 窗口留待第二阶段。

**Architecture:** 从 `App.tsx` 抽出 `src/L1-ui/features/desktop/` 三个模块：纯函数模型 `widget-model.ts`、配置页 `desktop-config-page.tsx`、交互式预览 `widget-preview.tsx`。配置作为工作区快照的可选字段 `desktopWidget` 随账户保存，旧快照缺字段时回填默认值。

**Tech Stack:** React + TypeScript、Vitest + Testing Library、现有 workspace 持久化（`server/workspace-store.ts` + `src/L4-data/workspace-repository.ts`）。

---

### Task 1: 桌面组件配置模型（widget-model）

**Files:**
- Create: `src/L1-ui/features/desktop/widget-model.ts`
- Test: `src/L1-ui/features/desktop/widget-model.test.ts`

- [ ] **Step 1: 编写失败测试**

创建 `src/L1-ui/features/desktop/widget-model.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_WIDGET_SETTINGS, normalizeWidgetSettings } from "./widget-model";

describe("normalizeWidgetSettings", () => {
  it("returns defaults for undefined input", () => {
    expect(normalizeWidgetSettings(undefined)).toEqual(DEFAULT_WIDGET_SETTINGS);
  });

  it("merges provided values over defaults", () => {
    const result = normalizeWidgetSettings({ opacity: 70, todayLimit: 3 });
    expect(result.opacity).toBe(70);
    expect(result.todayLimit).toBe(3);
    expect(result.tasksEnabled).toBe(true);
  });

  it("clamps opacity to 60–100", () => {
    expect(normalizeWidgetSettings({ opacity: 10 }).opacity).toBe(60);
    expect(normalizeWidgetSettings({ opacity: 200 }).opacity).toBe(100);
  });

  it("clamps limits to 1–20 and rounds", () => {
    expect(normalizeWidgetSettings({ todayLimit: 0 }).todayLimit).toBe(1);
    expect(normalizeWidgetSettings({ tasksLimit: 99 }).tasksLimit).toBe(20);
    expect(normalizeWidgetSettings({ todayLimit: 3.6 }).todayLimit).toBe(4);
  });

  it("falls back to standard fontSize for invalid values", () => {
    expect(normalizeWidgetSettings({ fontSize: "huge" as never }).fontSize).toBe("standard");
  });

  it("treats non-boolean flags as defaults", () => {
    expect(normalizeWidgetSettings({ todayEnabled: "yes" as never }).todayEnabled).toBe(true);
    expect(normalizeWidgetSettings({ tasksEnabled: 0 as never }).tasksEnabled).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/L1-ui/features/desktop/widget-model.test.ts`
Expected: FAIL，报错 `Cannot find module './widget-model'`。

- [ ] **Step 3: 编写最小实现**

创建 `src/L1-ui/features/desktop/widget-model.ts`：

```ts
export type DesktopWidgetFontSize = "compact" | "standard" | "large";

export type DesktopWidgetSettings = {
  todayEnabled: boolean;
  tasksEnabled: boolean;
  todayLimit: number;
  tasksLimit: number;
  opacity: number; // 60–100
  fontSize: DesktopWidgetFontSize;
};

export const DEFAULT_WIDGET_SETTINGS: DesktopWidgetSettings = {
  todayEnabled: true,
  tasksEnabled: true,
  todayLimit: 5,
  tasksLimit: 5,
  opacity: 92,
  fontSize: "standard",
};

const FONT_SIZES: DesktopWidgetFontSize[] = ["compact", "standard", "large"];

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

export function normalizeWidgetSettings(
  value: Partial<DesktopWidgetSettings> | undefined | null,
): DesktopWidgetSettings {
  const source = value ?? {};
  return {
    todayEnabled:
      typeof source.todayEnabled === "boolean"
        ? source.todayEnabled
        : DEFAULT_WIDGET_SETTINGS.todayEnabled,
    tasksEnabled:
      typeof source.tasksEnabled === "boolean"
        ? source.tasksEnabled
        : DEFAULT_WIDGET_SETTINGS.tasksEnabled,
    todayLimit: clampInt(source.todayLimit, DEFAULT_WIDGET_SETTINGS.todayLimit, 1, 20),
    tasksLimit: clampInt(source.tasksLimit, DEFAULT_WIDGET_SETTINGS.tasksLimit, 1, 20),
    opacity: clampInt(source.opacity, DEFAULT_WIDGET_SETTINGS.opacity, 60, 100),
    fontSize: FONT_SIZES.includes(source.fontSize as DesktopWidgetFontSize)
      ? (source.fontSize as DesktopWidgetFontSize)
      : DEFAULT_WIDGET_SETTINGS.fontSize,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/L1-ui/features/desktop/widget-model.test.ts`
Expected: PASS，6 个测试全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/L1-ui/features/desktop/widget-model.ts src/L1-ui/features/desktop/widget-model.test.ts
git commit -m "feat: add desktop widget settings model"
```

---

### Task 2: 工作区持久化扩展 desktopWidget 字段

**Files:**
- Modify: `server/workspace-store.ts`
- Modify: `src/L4-data/workspace-repository.ts`
- Test: `server/workspace-store.test.ts`

- [ ] **Step 1: 扩展服务端快照类型**

修改 `server/workspace-store.ts`，在 `WorkspaceSnapshot` 类型后新增可选字段与子类型：

```ts
export type DesktopWidgetSnapshot = {
  todayEnabled: boolean;
  tasksEnabled: boolean;
  todayLimit: number;
  tasksLimit: number;
  opacity: number;
  fontSize: string;
};

export type WorkspaceSnapshot = {
  version: 1;
  revision: number;
  updatedAt: string;
  tasks: unknown[];
  todayTodos: unknown[];
  settings: Record<string, unknown>;
  editableText: {
    siteName: string;
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    todayFocus: string;
  };
  desktopWidget?: DesktopWidgetSnapshot;
};
```

> `validate()` 已通过校验指定字段后原样返回 `value`，不会剥离额外字段，因此可选字段 `desktopWidget` 无需额外校验即可透传；旧快照缺该字段时由前端回填默认值。

- [ ] **Step 2: 新增服务端 round-trip 测试**

在 `server/workspace-store.test.ts` 末尾（`describe` 块内）新增：

```ts
  it("round-trips desktopWidget settings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workspace-"));
    const store = createWorkspaceStore(join(dir, "workspace.json"));
    await store.save({
      ...snapshot(),
      desktopWidget: { todayEnabled: false, tasksEnabled: true, todayLimit: 3, tasksLimit: 2, opacity: 80, fontSize: "large" },
    });
    expect((await store.load())?.desktopWidget).toEqual({
      todayEnabled: false,
      tasksEnabled: true,
      todayLimit: 3,
      tasksLimit: 2,
      opacity: 80,
      fontSize: "large",
    });
  });
```

- [ ] **Step 3: 运行服务端测试**

Run: `npx vitest run server/workspace-store.test.ts`
Expected: PASS，3 个测试全部通过。

- [ ] **Step 4: 扩展前端工作区类型**

修改 `src/L4-data/workspace-repository.ts`，引入模型类型并为 `WorkspaceDataV1` 增加可选字段：

```ts
import type { Task } from "./task-model";
import type { AppSettingsV1 } from "./settings-repository";
import type { DesktopWidgetSettings } from "../L1-ui/features/desktop/widget-model";

export type StoredTodayTodo = { id: string; content: string; reminderTime: string; completed: boolean; dailyReusable?: boolean };
export type EditableText = { siteName: string; heroEyebrow: string; heroTitle: string; heroDescription: string; todayFocus: string };
export type WorkspaceDataV1 = {
  version: 1;
  revision: number;
  updatedAt: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
  settings: AppSettingsV1;
  editableText: EditableText;
  desktopWidget?: DesktopWidgetSettings;
};
```

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`
Expected: 退出码 0，无类型错误。

- [ ] **Step 6: 提交**

```bash
git add server/workspace-store.ts server/workspace-store.test.ts src/L4-data/workspace-repository.ts
git commit -m "feat: persist desktop widget settings in workspace snapshot"
```

---

### Task 3: 交互式预览组件（widget-preview）

**Files:**
- Create: `src/L1-ui/features/desktop/widget-preview.tsx`
- Test: `src/L1-ui/features/desktop/widget-preview.test.tsx`

- [ ] **Step 1: 编写失败测试**

创建 `src/L1-ui/features/desktop/widget-preview.test.tsx`：

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WidgetPreview } from "./widget-preview";
import { DEFAULT_WIDGET_SETTINGS, type DesktopWidgetSettings } from "./widget-model";

const tasks = [
  { id: "k1", title: "学习 React", description: "", goal: "", completed: false, priority: "high" as const, durationHours: 1, steps: [] },
  { id: "k2", title: "已完成任务", description: "", goal: "", completed: true, priority: "low" as const, durationHours: 1, steps: [] },
];
const todos = [
  { id: "t1", content: "写周报", reminderTime: "18:00", completed: false },
  { id: "t2", content: "已完成待办", reminderTime: "", completed: true },
];

function renderPreview(settings: DesktopWidgetSettings = DEFAULT_WIDGET_SETTINGS) {
  const onToggleToday = vi.fn();
  const onOpenTask = vi.fn();
  const onAddToday = vi.fn();
  render(
    <WidgetPreview
      settings={settings}
      siteName="东非大裂谷"
      tasks={tasks}
      todayTodos={todos}
      onToggleToday={onToggleToday}
      onOpenTask={onOpenTask}
      onAddToday={onAddToday}
    />,
  );
  return { onToggleToday, onOpenTask, onAddToday };
}

describe("WidgetPreview", () => {
  it("shows only uncompleted today todos", () => {
    renderPreview();
    expect(screen.getByRole("button", { name: "完成待办：写周报" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "完成待办：已完成待办" })).not.toBeInTheDocument();
  });

  it("shows only uncompleted task names", () => {
    renderPreview();
    expect(screen.getByRole("button", { name: "打开任务：学习 React" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开任务：已完成任务" })).not.toBeInTheDocument();
  });

  it("hides task section when tasksEnabled is false", () => {
    renderPreview({ ...DEFAULT_WIDGET_SETTINGS, tasksEnabled: false });
    expect(screen.queryByLabelText("任务清单预览")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开任务：学习 React" })).not.toBeInTheDocument();
  });

  it("limits items to todayLimit/tasksLimit", () => {
    renderPreview({ ...DEFAULT_WIDGET_SETTINGS, todayLimit: 1, tasksLimit: 1 });
    expect(screen.getByLabelText("今日待办预览").querySelectorAll("button")).toHaveLength(2);
  });

  it("applies opacity from settings", () => {
    renderPreview({ ...DEFAULT_WIDGET_SETTINGS, opacity: 70 });
    expect(screen.getByTestId("widget-preview")).toHaveStyle({ opacity: "0.7" });
  });

  it("forwards interactions", () => {
    const { onToggleToday, onOpenTask, onAddToday } = renderPreview();
    fireEvent.click(screen.getByRole("button", { name: "完成待办：写周报" }));
    expect(onToggleToday).toHaveBeenCalledWith("t1");
    fireEvent.click(screen.getByRole("button", { name: "打开任务：学习 React" }));
    expect(onOpenTask).toHaveBeenCalledWith(tasks[0]);
    fireEvent.click(screen.getByRole("button", { name: "新增待办" }));
    expect(onAddToday).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/L1-ui/features/desktop/widget-preview.test.tsx`
Expected: FAIL，报错 `Cannot find module './widget-preview'`。

- [ ] **Step 3: 编写实现**

创建 `src/L1-ui/features/desktop/widget-preview.tsx`：

```tsx
import { Plus } from "lucide-react";
import type { Task } from "../../../L4-data/task-model";
import type { StoredTodayTodo } from "../../../L4-data/workspace-repository";
import type { DesktopWidgetSettings } from "./widget-model";

export function WidgetPreview({
  settings,
  siteName,
  tasks,
  todayTodos,
  onToggleToday,
  onOpenTask,
  onAddToday,
}: {
  settings: DesktopWidgetSettings;
  siteName: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
  onToggleToday: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onAddToday: () => void;
}) {
  const fontSizeClass =
    settings.fontSize === "compact"
      ? "preview-compact"
      : settings.fontSize === "large"
        ? "preview-large"
        : "preview-standard";
  const visibleToday = settings.todayEnabled
    ? todayTodos.filter((todo) => !todo.completed).slice(0, settings.todayLimit)
    : [];
  const visibleTasks = settings.tasksEnabled
    ? tasks.filter((task) => !task.completed).slice(0, settings.tasksLimit)
    : [];
  return (
    <div
      className={`desktop-preview ${fontSizeClass}`}
      style={{ opacity: settings.opacity / 100 }}
      data-testid="widget-preview"
    >
      <strong className="desktop-widget-name">{siteName}</strong>
      {settings.todayEnabled && (
        <section aria-label="今日待办预览">
          <em>TODAY</em>
          {visibleToday.length === 0 && (
            <span className="preview-empty">今日暂无待办</span>
          )}
          {visibleToday.map((todo) => (
            <button
              key={todo.id}
              onClick={() => onToggleToday(todo.id)}
              aria-label={`完成待办：${todo.content}`}
            >
              <span>○ {todo.content}</span>
              {todo.reminderTime && <small>{todo.reminderTime}</small>}
            </button>
          ))}
          <button className="widget-add" onClick={onAddToday} aria-label="新增待办">
            <Plus /> 新增待办
          </button>
        </section>
      )}
      {settings.tasksEnabled && (
        <section aria-label="任务清单预览">
          <em>TASKS</em>
          {visibleTasks.length === 0 && (
            <span className="preview-empty">没有进行中的任务</span>
          )}
          {visibleTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpenTask(task)}
              aria-label={`打开任务：${task.title}`}
            >
              <span>· {task.title}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/L1-ui/features/desktop/widget-preview.test.tsx`
Expected: PASS，6 个测试全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/L1-ui/features/desktop/widget-preview.tsx src/L1-ui/features/desktop/widget-preview.test.tsx
git commit -m "feat: add interactive desktop widget preview"
```

---

### Task 4: 配置页组件（desktop-config-page）

**Files:**
- Create: `src/L1-ui/features/desktop/desktop-config-page.tsx`
- Test: `src/L1-ui/features/desktop/desktop-config-page.test.tsx`

- [ ] **Step 1: 编写失败测试**

创建 `src/L1-ui/features/desktop/desktop-config-page.test.tsx`：

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DesktopConfigPage } from "./desktop-config-page";
import { DEFAULT_WIDGET_SETTINGS } from "./widget-model";

const tasks = [
  { id: "k1", title: "学习 React", description: "", goal: "", completed: false, priority: "high" as const, durationHours: 1, steps: [] },
];
const todos = [{ id: "t1", content: "写周报", reminderTime: "", completed: false }];

function renderPage() {
  const onChange = vi.fn();
  const onBack = vi.fn();
  render(
    <DesktopConfigPage
      settings={DEFAULT_WIDGET_SETTINGS}
      onChange={onChange}
      siteName="东非大裂谷"
      tasks={tasks}
      todayTodos={todos}
      onToggleToday={vi.fn()}
      onAddToday={vi.fn()}
      onOpenTask={vi.fn()}
      onBack={onBack}
    />,
  );
  return { onChange, onBack };
}

describe("DesktopConfigPage", () => {
  it("toggles today visibility through onChange", () => {
    const { onChange } = renderPage();
    fireEvent.click(screen.getByLabelText("显示今日待办"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ todayEnabled: false }));
  });

  it("changes opacity through onChange", () => {
    const { onChange } = renderPage();
    fireEvent.change(screen.getByLabelText("透明度"), { target: { value: "70" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ opacity: 70 }));
  });

  it("changes font size through onChange", () => {
    const { onChange } = renderPage();
    fireEvent.change(screen.getByLabelText("字体大小"), { target: { value: "large" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fontSize: "large" }));
  });

  it("calls onBack", () => {
    const { onBack } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "返回更多功能" }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/L1-ui/features/desktop/desktop-config-page.test.tsx`
Expected: FAIL，报错 `Cannot find module './desktop-config-page'`。

- [ ] **Step 3: 编写实现**

创建 `src/L1-ui/features/desktop/desktop-config-page.tsx`：

```tsx
import { ArrowLeft } from "lucide-react";
import type { Task } from "../../../L4-data/task-model";
import type { StoredTodayTodo } from "../../../L4-data/workspace-repository";
import { type DesktopWidgetSettings } from "./widget-model";
import { WidgetPreview } from "./widget-preview";

export function DesktopConfigPage({
  settings,
  onChange,
  siteName,
  tasks,
  todayTodos,
  onToggleToday,
  onAddToday,
  onOpenTask,
  onBack,
}: {
  settings: DesktopWidgetSettings;
  onChange: (next: DesktopWidgetSettings) => void;
  siteName: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
  onToggleToday: (id: string) => void;
  onAddToday: () => void;
  onOpenTask: (task: Task) => void;
  onBack: () => void;
}) {
  const set = (patch: Partial<DesktopWidgetSettings>) =>
    onChange({ ...settings, ...patch });
  return (
    <>
      <section className="page">
        <em>DESKTOP WIDGET</em>
        <h1>放入桌面</h1>
      </section>
      <button className="back-settings" onClick={onBack}>
        <ArrowLeft /> 返回更多功能
      </button>
      <div className="desktop-config-page">
        <section className="settings-panel desktop-controls" aria-label="桌面组件配置">
          <label className="setting-row">
            <span>显示今日待办</span>
            <input
              type="checkbox"
              aria-label="显示今日待办"
              checked={settings.todayEnabled}
              onChange={(e) => set({ todayEnabled: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>显示任务清单</span>
            <input
              type="checkbox"
              aria-label="显示任务清单"
              checked={settings.tasksEnabled}
              onChange={(e) => set({ tasksEnabled: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>今日待办数量</span>
            <input
              type="number"
              aria-label="今日待办数量"
              min={1}
              max={20}
              value={settings.todayLimit}
              onChange={(e) => set({ todayLimit: Number(e.target.value) })}
            />
          </label>
          <label className="setting-row">
            <span>任务清单数量</span>
            <input
              type="number"
              aria-label="任务清单数量"
              min={1}
              max={20}
              value={settings.tasksLimit}
              onChange={(e) => set({ tasksLimit: Number(e.target.value) })}
            />
          </label>
          <label className="setting-row">
            <span>透明度</span>
            <input
              type="range"
              aria-label="透明度"
              min={60}
              max={100}
              value={settings.opacity}
              onChange={(e) => set({ opacity: Number(e.target.value) })}
            />
          </label>
          <label className="setting-row">
            <span>字体大小</span>
            <select
              aria-label="字体大小"
              value={settings.fontSize}
              onChange={(e) =>
                set({ fontSize: e.target.value as DesktopWidgetSettings["fontSize"] })
              }
            >
              <option value="compact">紧凑</option>
              <option value="standard">标准</option>
              <option value="large">宽松</option>
            </select>
          </label>
        </section>
        <WidgetPreview
          settings={settings}
          siteName={siteName}
          tasks={tasks}
          todayTodos={todayTodos}
          onToggleToday={onToggleToday}
          onAddToday={onAddToday}
          onOpenTask={onOpenTask}
        />
      </div>
      <p className="desktop-phase-note">第二阶段将在此接入原生置底窗口（Tauri）。</p>
    </>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/L1-ui/features/desktop/desktop-config-page.test.tsx`
Expected: PASS，4 个测试全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/L1-ui/features/desktop/desktop-config-page.tsx src/L1-ui/features/desktop/desktop-config-page.test.tsx
git commit -m "feat: add desktop widget configuration page"
```

---

### Task 5: 接入 App 与样式

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 引入依赖与替换状态**

在 `src/App.tsx` 顶部 import 区新增：

```ts
import { DesktopConfigPage } from "./L1-ui/features/desktop/desktop-config-page";
import {
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
  type DesktopWidgetSettings,
} from "./L1-ui/features/desktop/widget-model";
```

将状态声明（约第 91–92 行）：

```ts
    [desktopConfigOpen, setDesktopConfigOpen] = useState(false),
    [widgetOpacity, setWidgetOpacity] = useState(92),
```

替换为：

```ts
    [desktopConfigOpen, setDesktopConfigOpen] = useState(false),
    [desktopWidget, setDesktopWidget] = useState<DesktopWidgetSettings>(DEFAULT_WIDGET_SETTINGS),
```

- [ ] **Step 2: 加载工作区时回填 desktopWidget**

在 `loadWorkspace` 的 effect 中，`if (data) { ... }` 分支内追加：

```ts
        setDesktopWidget(normalizeWidgetSettings(data.desktopWidget));
```

完整分支应为：

```ts
      if (data) {
        setTasks(data.tasks.map((task) => migrateTask(task)));
        setTodayTodos(data.todayTodos);
        setWorkspaceRevision(data.revision);
        applyEditableText(data.editableText);
        setSiteName(data.editableText.siteName);
        setSiteNameDraft(data.editableText.siteName);
        setDesktopWidget(normalizeWidgetSettings(data.desktopWidget));
      }
```

- [ ] **Step 3: 保存工作区时带上 desktopWidget**

将 `saveWorkspace` 调用改为在 payload 末尾追加 `desktopWidget`，并把 effect 依赖数组加上 `desktopWidget`：

```ts
    const timer = window.setTimeout(
      () =>
        saveWorkspace({
          version: 1,
          revision: workspaceRevision,
          updatedAt: "",
          tasks,
          todayTodos,
          settings: loadSettings(),
          editableText: { ...readEditableText(), siteName },
          desktopWidget,
        })
          .then((saved) => {
            setWorkspaceRevision(saved.revision);
            setSaveStatus("已保存");
          })
          .catch(() => setSaveStatus("保存失败")),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [tasks, todayTodos, siteName, desktopWidget, workspaceReady]);
```

- [ ] **Step 4: 新增今日待办切换的具名处理函数**

在 `addTodayTodo` 等处理函数附近新增（供预览复用，逻辑与现有内联实现一致）：

```ts
  const toggleTodayTodo = (id: string) =>
    setTodayTodos((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
```

- [ ] **Step 5: 将“其他功能”视图改为在配置页与卡片之间切换**

将 `{view === "其他功能" && (...)}` 整体替换为：

```tsx
          {view === "其他功能" &&
            (desktopConfigOpen ? (
              <DesktopConfigPage
                settings={desktopWidget}
                onChange={setDesktopWidget}
                siteName={siteName}
                tasks={tasks}
                todayTodos={todayTodos}
                onToggleToday={toggleTodayTodo}
                onAddToday={() => openTodayEditor()}
                onOpenTask={openEditTask}
                onBack={() => setDesktopConfigOpen(false)}
              />
            ) : (
              <Page over="EXPLORE CAPABILITIES" title="更多智能能力">
                <div className="features">
                  {[
                    ["聊天对话", MessageCircle],
                    ["AI 陪伴", Heart],
                    ["今日消息", Newspaper],
                    ["Agent", Network],
                    ["放入桌面", MonitorUp],
                    ["拓展功能", Sparkles],
                  ].map(([n, I]: any) => (
                    <button
                      key={n}
                      onClick={() => n === "放入桌面" && setDesktopConfigOpen(true)}
                    >
                      <I />
                      <small>AVAILABLE MODULE</small>
                      <h3>{n}</h3>
                      <p>进入模块，使用与任务关联的智能能力。</p>
                      <ArrowUpRight />
                    </button>
                  ))}
                </div>
              </Page>
            ))}
```

- [ ] **Step 6: 删除旧的“放入桌面”模态框**

删除整段 `{desktopConfigOpen && <div className="overlay"><section className="desktop-config modal">…</section></div>}`（原约第 679 行），其内容已由 `DesktopConfigPage` 取代。删除后确认代码中不再出现 `widgetOpacity`。

- [ ] **Step 7: 更新样式**

在 `src/index.css` 中：

1. **删除** 以下仅用于旧模态框的规则：`.modal.desktop-config`、`.desktop-config-grid`、`.desktop-options`（及其所有子规则）、`.desktop-place-button`。
2. **保留** `.desktop-preview`、`.desktop-widget-name`、`.desktop-preview section`、`.desktop-preview em`、`.desktop-preview section button`、`.desktop-preview small`、`.desktop-preview .widget-add`（预览复用）。
3. **新增** 以下规则（追加到文件末尾）：

```css
.desktop-config-page {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
  margin-top: 24px;
}
.desktop-preview .preview-empty {
  padding: 6px 4px;
  color: #666;
  font-size: 13px;
}
.desktop-preview.preview-compact { font-size: 12px; }
.desktop-preview.preview-standard { font-size: 14px; }
.desktop-preview.preview-large { font-size: 16px; }
.desktop-phase-note {
  margin-top: 18px;
  color: #8b8f94;
  font-size: 13px;
}
@media (max-width: 760px) {
  .desktop-config-page {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: 运行全部测试与类型检查**

Run: `npm test -- --run` 然后 `npm run typecheck`
Expected: 全部通过、退出码 0。特别注意 `src/App.test.tsx` 仍通过（未引用旧模态框）。

- [ ] **Step 9: 提交**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: wire desktop widget config page into navigation"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 全量回归**

Run: `npm test -- --run`、`npm run typecheck`、`npm run build`
Expected: 三者退出码均为 0。

- [ ] **Step 2: 手动验证**

Run: `npm run dev`，打开 `http://localhost:5173`：

1. 进入「其他功能」→ 点「放入桌面」，进入配置页（非模态框）。
2. 切换「显示今日待办 / 显示任务清单」开关，预览实时增删对应区块。
3. 调整数量、透明度、字体大小，预览实时响应。
4. 在预览中勾选今日待办、点任务名，确认与主任务/待办状态联动。
5. 点「返回更多功能」回到卡片网格。
6. 刷新页面，确认配置已持久化（工作区写入 `desktopWidget`）。

- [ ] **Step 3: 文档同步**

在 `PROJECT.md` 维护记录追加一行：

```text
| 2026-09-05 | 完成桌面组件第一阶段：新增网页配置页与交互式预览，配置随工作区按账户持久化；原生 Tauri 窗口留待第二阶段。 |
```

- [ ] **Step 4: 提交**

```bash
git add PROJECT.md
git commit -m "docs: record phase-one desktop widget"
```
