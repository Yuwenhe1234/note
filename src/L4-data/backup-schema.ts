import type { AppSettingsV1 } from "./settings-repository";
import type { TaskStep } from "./task-model";

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
  version: 1;
  exportedAt: string;
  tasks: BackupTask[];
  settings: AppSettingsV1;
};

export function createBackup(
  tasks: BackupTask[],
  settings: AppSettingsV1,
): MemoAgentBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: structuredClone(tasks),
    settings: structuredClone(settings),
  };
}
export function parseBackup(raw: string): MemoAgentBackup {
  try {
    const value = JSON.parse(raw) as MemoAgentBackup;
    if (
      value.version !== 1 ||
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
