import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type DesktopWidgetSnapshot = {
  todayEnabled: boolean;
  tasksEnabled: boolean;
  todayLimit: number;
  tasksLimit: number;
  opacity: number;
};

export type WorkspaceSnapshot = {
  version: 1;
  revision: number;
  updatedAt: string;
  tasks: unknown[];
  todayTodos: unknown[];
  settings: Record<string, unknown>;
  editableText: {
    siteName: string;
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    todayFocus: string;
  };
  desktopWidget?: DesktopWidgetSnapshot;
};

function validate(value: any): WorkspaceSnapshot {
  if (value?.version !== 1 || !Number.isInteger(value.revision) || !Array.isArray(value.tasks) || !Array.isArray(value.todayTodos) || !value.settings || !value.editableText || Object.values(value.editableText).some((item) => typeof item !== "string")) throw new Error("工作区数据格式不正确");
  return value;
}

export function createWorkspaceStore(filePath: string) {
  const backupPath = `${filePath}.backup`;
  const read = async (path: string) => validate(JSON.parse(await readFile(path, "utf8")));
  async function load(): Promise<WorkspaceSnapshot | null> {
    try { return await read(filePath); }
    catch (error: any) {
      if (error?.code === "ENOENT") return null;
      try { return await read(backupPath); } catch { throw new Error("工作区数据和备份均无法读取"); }
    }
  }
  async function save(input: WorkspaceSnapshot) {
    validate(input);
    const current = await load();
    if (current && input.revision < current.revision) throw new Error("页面数据版本过旧，请刷新后重试");
    const next = { ...input, revision: (current?.revision || input.revision) + 1, updatedAt: new Date().toISOString() };
    await mkdir(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    await writeFile(temporary, JSON.stringify(next, null, 2), "utf8");
    if (current) await copyFile(filePath, backupPath);
    await rename(temporary, filePath);
    return next;
  }
  return { load, save };
}
