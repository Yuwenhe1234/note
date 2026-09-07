import type { DesktopWidgetSettings } from "./widget-model";

export function calculateWidgetWindowHeight(
  settings: DesktopWidgetSettings,
  todayCount: number,
  taskCount: number,
): number {
  let height = 112;
  if (settings.todayEnabled) {
    height += 92 + Math.min(todayCount, settings.todayLimit) * 36;
  }
  if (settings.tasksEnabled) {
    height += 54 + Math.min(taskCount, settings.tasksLimit) * 36;
  }
  return Math.min(720, Math.max(220, height));
}
