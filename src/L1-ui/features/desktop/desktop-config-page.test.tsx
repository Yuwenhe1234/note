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

  it("calls onBack", () => {
    const { onBack } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "返回更多功能" }));
    expect(onBack).toHaveBeenCalled();
  });
});
