export type DesktopWidgetSettings = {
  todayEnabled: boolean;
  tasksEnabled: boolean;
  todayLimit: number;
  tasksLimit: number;
  opacity: number; // 60–100
  theme: "system" | "dark" | "light";
};

export const DEFAULT_WIDGET_SETTINGS: DesktopWidgetSettings = {
  todayEnabled: true,
  tasksEnabled: true,
  todayLimit: 5,
  tasksLimit: 5,
  opacity: 92,
  theme: "system",
};

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

export function normalizeWidgetSettings(
  value: Partial<DesktopWidgetSettings> | undefined | null,
): DesktopWidgetSettings {
  const source = value ?? {};
  return {
    todayEnabled:
      typeof source.todayEnabled === "boolean"
        ? source.todayEnabled
        : DEFAULT_WIDGET_SETTINGS.todayEnabled,
    tasksEnabled:
      typeof source.tasksEnabled === "boolean"
        ? source.tasksEnabled
        : DEFAULT_WIDGET_SETTINGS.tasksEnabled,
    todayLimit: clampInt(source.todayLimit, DEFAULT_WIDGET_SETTINGS.todayLimit, 1, 5),
    tasksLimit: clampInt(source.tasksLimit, DEFAULT_WIDGET_SETTINGS.tasksLimit, 1, 20),
    opacity: clampInt(source.opacity, DEFAULT_WIDGET_SETTINGS.opacity, 60, 100),
    theme:
      source.theme === "dark" || source.theme === "light" || source.theme === "system"
        ? source.theme
        : "system",
  };
}
