import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DesktopConfigPage } from "./desktop-config-page";
import { DEFAULT_WIDGET_SETTINGS } from "./widget-model";

const { openDesktopWidget } = vi.hoisted(() => ({ openDesktopWidget: vi.fn() }));
vi.mock("../../../L5-services/widget-window", () => ({ openDesktopWidget }));

const tasks = [
  { id: "k1", title: "学习 React", description: "", goal: "", completed: false, priority: "high" as const, durationHours: 1, steps: [] },
];
const todos = [{ id: "t1", content: "写周报", reminderTime: "", completed: false }];

function renderPage() {
  const onChange = vi.fn();
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
    />,
  );
  return { onChange };
}

describe("DesktopConfigPage", () => {
  it("explains that native widgets require the desktop edition", () => {
    render(<DesktopConfigPage settings={DEFAULT_WIDGET_SETTINGS} onChange={vi.fn()} siteName="东非大裂谷" tasks={tasks} todayTodos={todos} onToggleToday={vi.fn()} onAddToday={vi.fn()} onOpenTask={vi.fn()} desktopWidgetAvailable={false} />);
    expect(screen.getByText(/桌面组件仅在桌面版中可用/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "运行桌面挂件" })).not.toBeInTheDocument();
  });

  it("runs the configured desktop widget from the console", async () => {
    openDesktopWidget.mockResolvedValue("requested");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "运行桌面挂件" }));
    expect(openDesktopWidget).toHaveBeenCalledOnce();
    expect(await screen.findByText("正在通过 Windows 桌面助手启动挂件…")).toBeInTheDocument();
  });

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

  it("changes the widget appearance mode", () => {
    const { onChange } = renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "浅色" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ theme: "light" }));
  });

});
