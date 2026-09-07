import { useEffect, useRef, useState } from "react";
import { GripHorizontal, Pin, PinOff, X } from "lucide-react";
import { migrateTask, type Task } from "../../../L4-data/task-model";
import type { StoredTodayTodo } from "../../../L4-data/workspace-repository";
import { loadWorkspace } from "../../../L4-data/workspace-repository";
import { WidgetPreview } from "./widget-preview";
import { normalizeWidgetSettings, type DesktopWidgetSettings } from "./widget-model";
import {
  addDesktopWidgetTodo,
  completeDesktopWidgetTodo,
  hideDesktopWidget,
  loadDesktopWidgetWorkspace,
  resizeDesktopWidget,
  startDesktopWidgetResizeDragging,
  startDesktopWidgetDragging,
  setWidgetDesktopPinned,
  updateDesktopWidgetTask,
  updateDesktopWidgetTodo,
} from "../../../L5-services/widget-window";
import { isTauri } from "@tauri-apps/api/core";
import { calculateWidgetWindowHeight } from "./widget-window-layout";
import {
  WidgetInlineEditor,
  type WidgetEditorValue,
} from "./widget-inline-editor";

const PIN_STORAGE_KEY = "memo-agent-widget-desktop-pinned";

function readPinnedStorage(): boolean {
  try {
    return window.localStorage.getItem(PIN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePinnedStorage(value: boolean) {
  try {
    window.localStorage.setItem(PIN_STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

type WidgetData = {
  settings: DesktopWidgetSettings;
  siteName: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
};

export function DesktopWidgetWindow({
  data,
  onHide,
}: {
  data: WidgetData;
  onHide: () => void;
}) {
  const [pinned, setPinned] = useState<boolean>(() => readPinnedStorage());
  const [currentData, setCurrentData] = useState(data);
  const [editorMode, setEditorMode] = useState<
    { kind: "todo"; todo?: StoredTodayTodo } | { kind: "task"; task: Task } | null
  >(null);
  const [actionError, setActionError] = useState("");
  const autoSized = useRef(false);
  const manuallyResized = useRef(false);
  useEffect(() => setCurrentData(data), [data]);
  useEffect(() => {
    if (autoSized.current || manuallyResized.current) return;
    const todayCount = currentData.todayTodos.filter((todo) => !todo.completed).length;
    const taskCount = currentData.tasks.filter((task) => !task.completed).length;
    const contentHeight = calculateWidgetWindowHeight(
      currentData.settings,
      todayCount,
      taskCount,
    );
    void resizeDesktopWidget(
      editorMode ? Math.max(contentHeight, 620) : contentHeight,
    );
    autoSized.current = true;
  }, [currentData, editorMode]);
  const applyWorkspace = (workspace: Awaited<ReturnType<typeof loadDesktopWidgetWorkspace>>) => {
    if (!workspace) return;
    setCurrentData({
      settings: normalizeWidgetSettings(workspace.desktopWidget),
      siteName: workspace.editableText.siteName || currentData.siteName,
      tasks: workspace.tasks.map((task) => migrateTask(task)),
      todayTodos: workspace.todayTodos,
    });
  };
  const saveEditor = (value: WidgetEditorValue) => {
    setActionError("");
    const operation = value.kind === "todo"
      ? value.todoId
        ? updateDesktopWidgetTodo({
            todoId: value.todoId,
            content: value.content,
            reminderTime: value.reminderTime,
          })
        : addDesktopWidgetTodo({
            id: crypto.randomUUID(),
            content: value.content,
            reminderTime: value.reminderTime,
          })
      : updateDesktopWidgetTask(value);
    void operation
      .then((workspace) => {
        applyWorkspace(workspace);
        setEditorMode(null);
      })
      .catch((error) =>
        setActionError(error instanceof Error ? error.message : "保存失败"),
      );
  };
  return (
    <div className="desktop-widget-window" data-testid="desktop-widget-window">
      <div className="desktop-widget-window-bar" data-tauri-drag-region>
        <span
          className="desktop-widget-drag-label"
          data-tauri-drag-region
          onMouseDown={(event) => {
            if (event.button === 0) void startDesktopWidgetDragging();
          }}
        >
          <GripHorizontal aria-hidden="true" /> 拖动挂件
        </span>
        <button
          className={`desktop-widget-window-pin${pinned ? " is-active" : ""}`}
          aria-label={pinned ? "取消贴桌面(回到始终顶部)" : "贴到桌面(在所有正常窗口之下)"}
          aria-pressed={pinned}
          title={pinned ? "当前贴桌面中，点此回到始终顶部" : "贴到桌面图层"}
          onClick={(e) => {
            e.stopPropagation();
            setPinned((prev) => {
              const next = !prev;
              writePinnedStorage(next);
              void setWidgetDesktopPinned(next);
              return next;
            });
          }}
        >
          {pinned ? <Pin aria-hidden="true" /> : <PinOff aria-hidden="true" />}
        </button>
        <button
          className="desktop-widget-window-hide"
          onClick={onHide}
          aria-label="隐藏组件"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <WidgetPreview
        settings={currentData.settings}
        siteName={currentData.siteName}
        tasks={currentData.tasks}
        todayTodos={currentData.todayTodos}
        onToggleToday={(id) => {
          setActionError("");
          void completeDesktopWidgetTodo(id)
            .then(applyWorkspace)
            .catch((error) =>
              setActionError(
                error instanceof Error ? error.message : "待办更新失败",
              ),
            );
        }}
        onOpenTask={(task) => setEditorMode({ kind: "task", task })}
        onAddToday={() => setEditorMode({ kind: "todo" })}
        onEditToday={(todo) => setEditorMode({ kind: "todo", todo })}
      />
      {editorMode && (
        <WidgetInlineEditor
          mode={editorMode}
          onCancel={() => setEditorMode(null)}
          onSave={saveEditor}
        />
      )}
      {actionError && <p className="desktop-widget-action-error">{actionError}</p>}
      <div
        className="desktop-widget-resize-handle"
        aria-label="调整窗口大小"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          manuallyResized.current = true;
          void startDesktopWidgetResizeDragging();
        }}
      />
    </div>
  );
}

/** 桌面组件窗口的独立根：加载 `/#widget` 时渲染，自行读取工作区数据并定期刷新。 */
export function WidgetWindowRoot() {
  const [data, setData] = useState<WidgetData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("widget-window-mode");
    document.body.classList.add("widget-window-mode");
    return () => {
      document.documentElement.classList.remove("widget-window-mode");
      document.body.classList.remove("widget-window-mode");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      (isTauri() ? loadDesktopWidgetWorkspace() : loadWorkspace())
        .then((workspace) => {
          if (cancelled) return;
          if (!workspace) {
            setError("工作区数据不存在");
            return;
          }
          setData({
            settings: normalizeWidgetSettings(workspace.desktopWidget),
            siteName: workspace.editableText.siteName || "东非大裂谷",
            tasks: workspace.tasks.map((task) => migrateTask(task)),
            todayTodos: workspace.todayTodos,
          });
          setError("");
        })
        .catch((err) => {
          if (!cancelled)
            setError(err instanceof Error ? err.message : "工作区加载失败");
        });
    refresh();
    const timer = window.setInterval(() => {
      if (!cancelled) refresh();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (error) return <div className="desktop-widget-window-error">{error}</div>;
  if (!data) return <div className="desktop-widget-window-loading">加载中…</div>;

  return (
    <DesktopWidgetWindow data={data} onHide={() => hideDesktopWidget()} />
  );
}
