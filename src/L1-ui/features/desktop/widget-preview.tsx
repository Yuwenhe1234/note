import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
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
  onEditToday,
}: {
  settings: DesktopWidgetSettings;
  siteName: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
  onToggleToday: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onAddToday: () => void;
  onEditToday?: (todo: StoredTodayTodo) => void;
}) {
  const visibleToday = settings.todayEnabled
    ? todayTodos.filter((todo) => !todo.completed).slice(0, Math.min(5, settings.todayLimit))
    : [];
  const visibleTasks = settings.tasksEnabled
    ? tasks.filter((task) => !task.completed).slice(0, settings.tasksLimit)
    : [];
  return (
    <div
      className={`desktop-preview widget-theme-${settings.theme}`}
      style={{ "--widget-opacity": String(settings.opacity / 100) } as CSSProperties}
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
            <div key={todo.id} className="widget-todo-row">
              <button
                className="widget-todo-check"
                type="button"
              onClick={() => onToggleToday(todo.id)}
              aria-label={`完成待办：${todo.content}`}
            >
                ○
              </button>
              <button
                className="widget-todo-title"
                type="button"
                aria-label={`编辑待办：${todo.content}`}
                onDoubleClick={() => onEditToday?.(todo)}
              >
                <span>{todo.content}</span>
                {todo.reminderTime && <small>{todo.reminderTime}</small>}
              </button>
            </div>
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
