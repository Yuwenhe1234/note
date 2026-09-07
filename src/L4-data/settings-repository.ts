export type AppSettingsV1 = {
  version: 1;
  taskDefaults: { defaultPriority: "low" | "medium" | "high"; defaultStatus: "in_progress" | "pending"; defaultDurationMinutes: number; minSteps: number; maxSteps: number; completedVisibility: "show" | "hide"; sortBy: "created" | "priority" | "title"; includeOverdueToday: boolean; weekStartsOn: 0 | 1; timeFormat: "12h" | "24h" };
  appearance: { theme: "dark" | "light" | "system"; accent: "green" | "blue" | "orange"; fontSize: "compact" | "standard" | "large"; density: "compact" | "standard" | "comfortable"; pageWidth: "fixed" | "wide" };
  interaction: { animations: boolean; reducedMotion: boolean; confirmComplete: boolean; confirmDelete: boolean; autoFocus: boolean; editTrigger: "double-click" | "long-press" };
  reminders: { notifications: boolean; defaultLeadMinutes: number; overdueReminder: boolean; quietStart: string; quietEnd: string };
};

export const SETTINGS_STORAGE_KEY = "memo-agent-settings-v1";
export const DEFAULT_SETTINGS: AppSettingsV1 = {
  version: 1,
  taskDefaults: { defaultPriority: "medium", defaultStatus: "in_progress", defaultDurationMinutes: 60, minSteps: 3, maxSteps: 6, completedVisibility: "show", sortBy: "created", includeOverdueToday: true, weekStartsOn: 1, timeFormat: "24h" },
  appearance: { theme: "dark", accent: "green", fontSize: "standard", density: "standard", pageWidth: "fixed" },
  interaction: { animations: true, reducedMotion: false, confirmComplete: false, confirmDelete: true, autoFocus: true, editTrigger: "double-click" },
  reminders: { notifications: false, defaultLeadMinutes: 15, overdueReminder: true, quietStart: "23:00", quietEnd: "08:00" },
};

const mergeSettings = (value: Partial<AppSettingsV1>): AppSettingsV1 => ({
  ...DEFAULT_SETTINGS,
  ...value,
  version: 1,
  taskDefaults: { ...DEFAULT_SETTINGS.taskDefaults, ...(value.taskDefaults || {}) },
  appearance: { ...DEFAULT_SETTINGS.appearance, ...(value.appearance || {}) },
  interaction: { ...DEFAULT_SETTINGS.interaction, ...(value.interaction || {}) },
  reminders: { ...DEFAULT_SETTINGS.reminders, ...(value.reminders || {}) },
});
export function loadSettings(): AppSettingsV1 { try { return mergeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}")); } catch { return structuredClone(DEFAULT_SETTINGS); } }
export function saveSettings(value: AppSettingsV1): void { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value)); }
export function resetSettings(): AppSettingsV1 { localStorage.removeItem(SETTINGS_STORAGE_KEY); return structuredClone(DEFAULT_SETTINGS); }
