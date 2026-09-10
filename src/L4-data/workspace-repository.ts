import type { Task } from "./task-model";
import type { AppSettingsV1 } from "./settings-repository";
import type { DesktopWidgetSettings } from "../L1-ui/features/desktop/widget-model";
import { runtimeCapabilities } from "../L5-services/runtime-capabilities";

export type StoredTodayTodo = { id: string; content: string; reminderTime: string; completed: boolean; dailyReusable?: boolean };
export type EditableText = { siteName: string; heroEyebrow: string; heroTitle: string; heroDescription: string; todayFocus: string };
export type WorkspaceDataV1 = {
  version: 1;
  revision: number;
  updatedAt: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
  settings: AppSettingsV1;
  editableText: EditableText;
  desktopWidget?: DesktopWidgetSettings;
};

const WEB_WORKSPACE_KEY = "memo-agent-workspace-v1";
type WorkspaceOptions = { storage?: Storage; serverWorkspace?: boolean };
const resolveOptions = (value: WorkspaceOptions = {}) => ({
  storage: value.storage ?? localStorage,
  serverWorkspace: value.serverWorkspace ?? runtimeCapabilities.serverWorkspace,
});

function isWorkspace(value: unknown): value is WorkspaceDataV1 {
  const data = value as Partial<WorkspaceDataV1> | null;
  return data?.version === 1 && Array.isArray(data.tasks) && Array.isArray(data.todayTodos) && Boolean(data.settings) && Boolean(data.editableText);
}

export async function loadWorkspace(value: WorkspaceOptions = {}): Promise<WorkspaceDataV1 | null> {
  const { storage, serverWorkspace } = resolveOptions(value);
  if (!serverWorkspace) {
    const raw = storage.getItem(WEB_WORKSPACE_KEY);
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isWorkspace(parsed)) throw new Error();
      return parsed;
    } catch {
      throw new Error("浏览器工作区数据已损坏");
    }
  }
  const response = await fetch("/api/workspace"); const result = await response.json();
  if (!result.ok) throw new Error(result.error || "读取工作区失败"); return result.data;
}
export async function saveWorkspace(data: WorkspaceDataV1, value: WorkspaceOptions = {}): Promise<WorkspaceDataV1> {
  const { storage, serverWorkspace } = resolveOptions(value);
  if (!serverWorkspace) {
    const saved = structuredClone({ ...data, revision: data.revision + 1, updatedAt: new Date().toISOString() });
    try {
      storage.setItem(WEB_WORKSPACE_KEY, JSON.stringify(saved));
      return saved;
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        throw new Error("浏览器存储空间不足，工作区未保存");
      }
      throw error;
    }
  }
  const response = await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const result = await response.json(); if (!result.ok) throw new Error(result.error || "保存工作区失败"); return result.data;
}
export const readEditableText = (): EditableText => ({
  siteName: localStorage.getItem("memo-agent-site-name") || "东非大裂谷",
  heroEyebrow: localStorage.getItem("memo-agent-hero-eyebrow") || "PERSONAL AGENT WORKSPACE",
  heroTitle: localStorage.getItem("memo-agent-hero-title") || "把想法变成\n清晰的行动。",
  heroDescription: localStorage.getItem("memo-agent-hero-description") || "Agent 理解目标，拆解步骤、估算时间，并在真正重要的时候提醒你。",
  todayFocus: localStorage.getItem("memo-agent-today-focus") || "",
});
export function applyEditableText(text: EditableText) { Object.entries({ "memo-agent-site-name": text.siteName, "memo-agent-hero-eyebrow": text.heroEyebrow, "memo-agent-hero-title": text.heroTitle, "memo-agent-hero-description": text.heroDescription, "memo-agent-today-focus": text.todayFocus }).forEach(([key, value]) => value && localStorage.setItem(key, value)); }
