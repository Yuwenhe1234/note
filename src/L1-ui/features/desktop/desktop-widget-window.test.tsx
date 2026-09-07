import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesktopWidgetWindow } from "./desktop-widget-window";
import { DEFAULT_WIDGET_SETTINGS } from "./widget-model";

const services = vi.hoisted(() => ({
  addDesktopWidgetTodo: vi.fn(),
  completeDesktopWidgetTodo: vi.fn(),
  hideDesktopWidget: vi.fn(),
  loadDesktopWidgetWorkspace: vi.fn(),
  resizeDesktopWidget: vi.fn(),
  startDesktopWidgetResizeDragging: vi.fn(),
  startDesktopWidgetDragging: vi.fn(),
  setWidgetDesktopPinned: vi.fn(),
  updateDesktopWidgetTask: vi.fn(),
}));
vi.mock("../../../L5-services/widget-window", () => services);

const data = {
  settings: DEFAULT_WIDGET_SETTINGS,
  siteName: "东非大裂谷",
  tasks: [
    { id: "k1", title: "学习 React", description: "", goal: "", completed: false, priority: "high" as const, durationHours: 1, steps: [] },
  ],
  todayTodos: [{ id: "t1", content: "写周报", reminderTime: "18:00", completed: false }],
};

describe("DesktopWidgetWindow", () => {
  it("renders the widget preview and controls", () => {
    render(<DesktopWidgetWindow data={data} onHide={vi.fn()} />);
    expect(screen.getByTestId("desktop-widget-window")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开任务：学习 React" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "隐藏组件" })).toBeInTheDocument();
  });

  it("calls onHide when the hide button is clicked", () => {
    const onHide = vi.fn();
    render(<DesktopWidgetWindow data={data} onHide={onHide} />);
    fireEvent.click(screen.getByRole("button", { name: "隐藏组件" }));
    expect(onHide).toHaveBeenCalled();
  });

  it("completes and immediately removes a today todo", async () => {
    services.completeDesktopWidgetTodo.mockResolvedValue({
      version: 1,
      desktopWidget: DEFAULT_WIDGET_SETTINGS,
      editableText: { siteName: "东非大裂谷" },
      tasks: data.tasks,
      todayTodos: [{ ...data.todayTodos[0], completed: true }],
    });
    render(<DesktopWidgetWindow data={data} onHide={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "完成待办：写周报" }));
    expect(services.completeDesktopWidgetTodo).toHaveBeenCalledWith("t1");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "完成待办：写周报" })).not.toBeInTheDocument(),
    );
  });

  it("opens inline editors for adding todos and editing tasks", () => {
    render(<DesktopWidgetWindow data={data} onHide={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "新增待办" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("新增待办");
    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "打开任务：学习 React" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("编辑任务");
  });

  it("starts native dragging from the top bar", () => {
    render(<DesktopWidgetWindow data={data} onHide={vi.fn()} />);
    fireEvent.mouseDown(screen.getByText("拖动挂件"), { button: 0 });
    expect(services.startDesktopWidgetDragging).toHaveBeenCalledOnce();
  });

  it("resizes from the corner handle", () => {
    render(<DesktopWidgetWindow data={data} onHide={vi.fn()} />);
    const handle = screen.getByLabelText("调整窗口大小");
    fireEvent.mouseDown(handle, { button: 0 });
    expect(services.startDesktopWidgetResizeDragging).toHaveBeenCalledOnce();
  });

  it("does not snap back after a manual resize when data refreshes", async () => {
    const { rerender } = render(<DesktopWidgetWindow data={data} onHide={vi.fn()} />);
    await waitFor(() => expect(services.resizeDesktopWidget).toHaveBeenCalled());
    fireEvent.mouseDown(screen.getByLabelText("调整窗口大小"), { button: 0 });
    services.resizeDesktopWidget.mockClear();
    rerender(<DesktopWidgetWindow data={{ ...data }} onHide={vi.fn()} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(services.resizeDesktopWidget).not.toHaveBeenCalled();
  });
});
