import type { Task } from "./task-model";
import type { AppSettingsV1 } from "./settings-repository";
import type { DesktopWidgetSettings } from "../L1-ui/features/desktop/widget-model";

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

export async function loadWorkspace(): Promise<WorkspaceDataV1 | null> {
  const response = await fetch("/api/workspace"); const result = await response.json();
  if (!result.ok) throw new Error(result.error || "读取工作区失败"); return result.data;
}
export async function saveWorkspace(data: WorkspaceDataV1): Promise<WorkspaceDataV1> {
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
