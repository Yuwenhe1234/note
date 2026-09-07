import { invoke } from "@tauri-apps/api/core";

export const buildAddTodayPath = () => "/?widgetAction=add-today";

export const buildTaskPath = (taskId: string) =>
  `/?widgetTask=${encodeURIComponent(taskId)}`;

export async function openWidgetWebsite(path: string): Promise<void> {
  await invoke("open_widget_website", { route: path });
}
