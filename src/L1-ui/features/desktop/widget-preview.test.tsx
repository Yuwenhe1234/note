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
  { id: "t3", content: "待办 3", reminderTime: "", completed: false },
  { id: "t4", content: "待办 4", reminderTime: "", completed: false },
  { id: "t5", content: "待办 5", reminderTime: "", completed: false },
  { id: "t6", content: "待办 6", reminderTime: "", completed: false },
  { id: "t7", content: "待办 7", reminderTime: "", completed: false },
];

function renderPreview(settings: DesktopWidgetSettings = DEFAULT_WIDGET_SETTINGS) {
  const onToggleToday = vi.fn();
  const onOpenTask = vi.fn();
  const onAddToday = vi.fn();
  const onEditToday = vi.fn();
  render(
    <WidgetPreview
      settings={settings}
      siteName="东非大裂谷"
      tasks={tasks}
      todayTodos={todos}
      onToggleToday={onToggleToday}
      onOpenTask={onOpenTask}
      onAddToday={onAddToday}
      onEditToday={onEditToday}
    />,
  );
  return { onToggleToday, onOpenTask, onAddToday, onEditToday };
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
    expect(screen.getByLabelText("今日待办预览").querySelectorAll("button")).toHaveLength(3);
  });

  it("never shows more than five unfinished today todos", () => {
    renderPreview({ ...DEFAULT_WIDGET_SETTINGS, todayLimit: 20 });
    expect(screen.getByRole("button", { name: "完成待办：待办 6" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "完成待办：待办 7" })).not.toBeInTheDocument();
  });

  it("applies opacity from settings", () => {
    renderPreview({ ...DEFAULT_WIDGET_SETTINGS, opacity: 70 });
    expect(screen.getByTestId("widget-preview")).toHaveStyle({ "--widget-opacity": "0.7" });
    expect(screen.getByTestId("widget-preview")).not.toHaveStyle({ opacity: "0.7" });
  });

  it("applies the selected appearance theme", () => {
    renderPreview({ ...DEFAULT_WIDGET_SETTINGS, theme: "light" });
    expect(screen.getByTestId("widget-preview")).toHaveClass("widget-theme-light");
  });

  it("forwards interactions", () => {
    const { onToggleToday, onOpenTask, onAddToday, onEditToday } = renderPreview();
    fireEvent.click(screen.getByRole("button", { name: "完成待办：写周报" }));
    expect(onToggleToday).toHaveBeenCalledWith("t1");
    fireEvent.doubleClick(screen.getByRole("button", { name: "编辑待办：写周报" }));
    expect(onEditToday).toHaveBeenCalledWith(todos[0]);
    fireEvent.click(screen.getByRole("button", { name: "打开任务：学习 React" }));
    expect(onOpenTask).toHaveBeenCalledWith(tasks[0]);
    fireEvent.click(screen.getByRole("button", { name: "新增待办" }));
    expect(onAddToday).toHaveBeenCalled();
  });
});
