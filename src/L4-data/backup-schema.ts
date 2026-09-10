import type { AppSettingsV1 } from "./settings-repository";
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
    if (
      ![1, 2].includes(value.version) ||
      !Array.isArray(value.tasks) ||
      !value.settings ||
      value.tasks.some(
        (task) =>
          typeof task.id !== "string" ||
          typeof task.title !== "string" ||
          typeof task.completed !== "boolean",
      )
    )
      throw new Error();
    return value;
  } catch {
    throw new Error("备份格式不正确，现有数据未被修改");
  }
}
