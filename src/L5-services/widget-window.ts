import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WorkspaceDataV1 } from "../L4-data/workspace-repository";

export type DesktopWidgetResult = "created" | "shown" | "requested";

/** 创建（或聚焦）置底的原生桌面组件窗口。
 *
 * - `"created"`：新建了一个组件窗口。
 * - `"shown"`：组件窗口已存在，已展示并聚焦到前台。
 * - `"unsupported"`：当前不在 Tauri 环境，调用方应回退到网页内的预览/说明。
 */
export async function openDesktopWidget(
  fetcher: typeof fetch = fetch,
): Promise<DesktopWidgetResult> {
  if (!isTauri()) {
    const response = await fetcher("/api/desktop-widget/open", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "桌面挂件启动失败");
    }
    return "requested";
  }
  const status = await invoke<string>("open_desktop_widget");
  return status === "created" ? "created" : "shown";
}

export async function loadDesktopWidgetWorkspace(): Promise<WorkspaceDataV1 | null> {
  if (!isTauri()) return null;
  return invoke<WorkspaceDataV1 | null>("load_desktop_widget_data");
}

export async function resizeDesktopWidget(height: number): Promise<void> {
  if (!isTauri()) return;
  await invoke("resize_desktop_widget", { height });
}

export async function resizeDesktopWidgetTo(width: number, height: number): Promise<void> {
  if (!isTauri()) return;
  await invoke("resize_desktop_widget_to", { width, height });
}

export async function completeDesktopWidgetTodo(
  todoId: string,
): Promise<WorkspaceDataV1> {
  return invoke<WorkspaceDataV1>("complete_desktop_widget_todo", { todoId });
}

export async function startDesktopWidgetDragging(): Promise<void> {
  if (!isTauri()) return;
  await invoke("start_widget_dragging");
}

export async function startDesktopWidgetResizeDragging(): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().startResizeDragging("SouthEast");
}

export async function addDesktopWidgetTodo(input: {
  id: string;
  content: string;
  reminderTime: string;
}): Promise<WorkspaceDataV1> {
  return invoke<WorkspaceDataV1>("add_desktop_widget_todo", input);
}

export async function updateDesktopWidgetTodo(input: {
  todoId: string;
  content: string;
  reminderTime: string;
}): Promise<WorkspaceDataV1> {
  return invoke<WorkspaceDataV1>("update_desktop_widget_todo", input);
}

export async function updateDesktopWidgetTask(input: {
  taskId: string;
  title: string;
  description: string;
  goal: string;
}): Promise<WorkspaceDataV1> {
  return invoke<WorkspaceDataV1>("update_desktop_widget_task", input);
}

/** 隐藏并停用桌面组件窗口。 */
export async function hideDesktopWidget(): Promise<void> {
  if (!isTauri()) return;
  await invoke("hide_desktop_widget");
}

/** 将主窗口带到前台（供组件交互跳回主应用）。 */
export async function focusMainWindow(): Promise<void> {
  if (!isTauri()) return;
  await invoke("focus_main_window");
}

/** 切换组件窗口的"贴桌面 / 始终顶部"模式。`pinned=true` 时窗口贴在桌面图标上方、所有正常窗口之下;`false` 时回到始终置顶。*/
export async function setWidgetDesktopPinned(pinned: boolean): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_widget_desktop_pinned", { pinned });
}
