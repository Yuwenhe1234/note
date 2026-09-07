import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke, startDragging, startResizeDragging, tauriState } = vi.hoisted(() => ({
  invoke: vi.fn(),
  startDragging: vi.fn(),
  startResizeDragging: vi.fn(),
  tauriState: { active: true },
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => tauriState.active,
  invoke,
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ startDragging, startResizeDragging }),
}));

import {
  completeDesktopWidgetTodo,
  addDesktopWidgetTodo,
  loadDesktopWidgetWorkspace,
  openDesktopWidget,
  resizeDesktopWidget,
  startDesktopWidgetResizeDragging,
  startDesktopWidgetDragging,
  updateDesktopWidgetTask,
} from "./widget-window";

describe("desktop widget window service", () => {
  beforeEach(() => {
    invoke.mockReset();
    tauriState.active = true;
  });

  it("shows the preloaded Tauri widget window instead of creating a webview", async () => {
    invoke.mockResolvedValue("shown");

    await expect(openDesktopWidget()).resolves.toBe("shown");
    expect(invoke).toHaveBeenCalledWith("open_desktop_widget");
  });

  it("requests the local launch API from browser mode", async () => {
    tauriState.active = false;
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, status: "started" }),
    });

    await expect(openDesktopWidget(fetch)).resolves.toBe("requested");
    expect(fetch).toHaveBeenCalledWith("/api/desktop-widget/open", { method: "POST" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("surfaces local launch API errors", async () => {
    tauriState.active = false;
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "启动失败" }),
    });

    await expect(openDesktopWidget(fetch)).rejects.toThrow("启动失败");
  });

  it("loads widget data through the native Tauri command", async () => {
    const workspace = { version: 1, tasks: [], todayTodos: [] };
    invoke.mockResolvedValue(workspace);

    await expect(loadDesktopWidgetWorkspace()).resolves.toEqual(workspace);
    expect(invoke).toHaveBeenCalledWith("load_desktop_widget_data");
  });

  it("resizes the native widget window", async () => {
    invoke.mockResolvedValue(undefined);
    await resizeDesktopWidget(438);
    expect(invoke).toHaveBeenCalledWith("resize_desktop_widget", { height: 438 });
  });

  it("starts native southeast window resizing", async () => {
    startResizeDragging.mockResolvedValue(undefined);
    await startDesktopWidgetResizeDragging();
    expect(startResizeDragging).toHaveBeenCalledWith("SouthEast");
  });

  it("completes a today todo through the native command", async () => {
    invoke.mockResolvedValue({ version: 1, todayTodos: [] });
    await completeDesktopWidgetTodo("todo-1");
    expect(invoke).toHaveBeenCalledWith("complete_desktop_widget_todo", {
      todoId: "todo-1",
    });
  });

  it("starts native window dragging", async () => {
    invoke.mockResolvedValue(undefined);
    await startDesktopWidgetDragging();
    expect(invoke).toHaveBeenCalledWith("start_widget_dragging");
  });

  it("adds a todo through the native command", async () => {
    invoke.mockResolvedValue({ version: 1, todayTodos: [] });
    await addDesktopWidgetTodo({ id: "n1", content: "买牛奶", reminderTime: "18:30" });
    expect(invoke).toHaveBeenCalledWith("add_desktop_widget_todo", {
      id: "n1",
      content: "买牛奶",
      reminderTime: "18:30",
    });
  });

  it("updates a task through the native command", async () => {
    invoke.mockResolvedValue({ version: 1, tasks: [] });
    await updateDesktopWidgetTask({
      taskId: "t1",
      title: "新标题",
      description: "说明",
      goal: "目标",
    });
    expect(invoke).toHaveBeenCalledWith("update_desktop_widget_task", {
      taskId: "t1",
      title: "新标题",
      description: "说明",
      goal: "目标",
    });
  });
});
