import { DEFAULT_SETTINGS, type AppSettingsV1 } from "./settings-repository";
import type { TaskStep } from "./task-model";
import type { WorkspaceDataV1 } from "./workspace-repository";

export type BackupTask = {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
  goal?: string;
  priority?: "low" | "medium" | "high";
  durationMinutes?: number;
  durationHours?: number;
  steps?: number | TaskStep[] | Array<Partial<TaskStep> & { minutes?: number }>;
};
export type MemoAgentBackup = {
  version: 1 | 2;
  exportedAt: string;
  tasks: BackupTask[];
  settings: AppSettingsV1;
  workspace?: WorkspaceDataV1;
  news?: { version: 1; sources: unknown[]; items: unknown[]; fingerprints: string[] };
  ai?: { provider: string; baseUrl: string; model: string; enabled: boolean };
};

export function createBackup(
  tasks: BackupTask[],
  settings: AppSettingsV1,
  browser?: {
    workspace?: WorkspaceDataV1;
    news?: MemoAgentBackup["news"];
    ai?: { provider: string; baseUrl: string; model: string; enabled: boolean; apiKey?: string };
  },
): MemoAgentBackup {
  const ai = browser?.ai ? { provider: browser.ai.provider, baseUrl: browser.ai.baseUrl, model: browser.ai.model, enabled: browser.ai.enabled } : undefined;
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks: structuredClone(tasks),
    settings: structuredClone(settings),
    ...(browser?.workspace ? { workspace: structuredClone(browser.workspace) } : {}),
    ...(browser?.news ? { news: structuredClone(browser.news) } : {}),
    ...(ai ? { ai } : {}),
  };
}
export function parseBackup(raw: string): MemoAgentBackup {
  try {
    const value = JSON.parse(raw) as MemoAgentBackup;
    const record = (item: unknown): item is Record<string, unknown> => typeof item === "object" && item !== null;
    const sameShape = (template: unknown, item: unknown): boolean => {
      if (record(template)) return record(item) && Object.keys(template).every((key) => sameShape(template[key], item[key]));
      return typeof item === typeof template;
    };
    const validSettings = (item: unknown) => sameShape(DEFAULT_SETTINGS, item);
    const validTask = (item: unknown) => record(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.completed === "boolean";
    const validTodo = (item: unknown) => record(item) && typeof item.id === "string" && typeof item.content === "string" && typeof item.reminderTime === "string" && typeof item.completed === "boolean";
    const validEditableText = (item: unknown) => record(item) && ["siteName", "heroEyebrow", "heroTitle", "heroDescription", "todayFocus"].every((key) => typeof item[key] === "string");
    const validSource = (item: unknown) => record(item) && ["id", "url", "name", "platform", "subscribedAt", "loginStatus"].every((key) => typeof item[key] === "string");
    const validNewsItem = (item: unknown) => record(item) && ["id", "sourceId", "platform", "title", "url", "sourceName", "publishedAt", "savedAt", "summary"].every((key) => typeof item[key] === "string") && Array.isArray(item.highlights) && item.highlights.every((entry) => typeof entry === "string");
    const settingsValid = validSettings(value.settings);
    const workspaceValid = value.workspace === undefined || (record(value.workspace) && value.workspace.version === 1 && typeof value.workspace.revision === "number" && typeof value.workspace.updatedAt === "string" && Array.isArray(value.workspace.tasks) && value.workspace.tasks.every(validTask) && Array.isArray(value.workspace.todayTodos) && value.workspace.todayTodos.every(validTodo) && validSettings(value.workspace.settings) && validEditableText(value.workspace.editableText));
    const newsValid = value.news === undefined || (record(value.news) && value.news.version === 1 && Array.isArray(value.news.sources) && value.news.sources.every(validSource) && Array.isArray(value.news.items) && value.news.items.every(validNewsItem) && Array.isArray(value.news.fingerprints) && value.news.fingerprints.every((entry) => typeof entry === "string"));
    const aiValid = value.ai === undefined || (record(value.ai) && typeof value.ai.provider === "string" && typeof value.ai.baseUrl === "string" && typeof value.ai.model === "string" && typeof value.ai.enabled === "boolean" && !("apiKey" in value.ai));
    if (
      ![1, 2].includes(value.version) ||
      !Array.isArray(value.tasks) ||
      !settingsValid || !workspaceValid || !newsValid || !aiValid ||
      (value.version === 1 && (value.workspace !== undefined || value.news !== undefined || value.ai !== undefined)) ||
      value.tasks.some((task) => !validTask(task))
    )
      throw new Error();
    return value;
  } catch {
    throw new Error("备份格式不正确，现有数据未被修改");
  }
}

export function restoreBrowserBackup(backup: MemoAgentBackup, storage: Storage = localStorage): void {
  const entries: [string, string][] = [];
  if (backup.workspace) entries.push(["memo-agent-workspace-v1", JSON.stringify(backup.workspace)]);
  if (backup.news) entries.push(["memo-agent-news-v1", JSON.stringify(backup.news)]);
  if (backup.ai) entries.push(["memo-agent-ai-config-v1", JSON.stringify({ ...backup.ai, apiKey: "" })]);
  const previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));
  try { entries.forEach(([key, value]) => storage.setItem(key, value)); }
  catch {
    previous.forEach((value, key) => value === null ? storage.removeItem(key) : storage.setItem(key, value));
    throw new Error("备份导入失败，原有数据已恢复");
  }
}
