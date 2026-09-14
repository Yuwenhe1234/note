export type TaskStep = { id: string; title: string; hours: number; completed: boolean; questions?: string[] };
export type TaskDomainMap = { prerequisites: string[]; coreConcepts: string[]; advancedTopics: string[] };
export type TaskResources = { systemResources: string[]; externalRecommendations: { websites: string[]; upMasters: string[]; communities: string[] } };
export type TaskMindMap = { nodes: { id: string; label: string; x: number; y: number }[]; edges: { id: string; source: string; target: string; kind?: "main" | "feedback" }[] };
export type TaskResourceRecord = { name: string; platform: string; url: string; searchQuery: string; reason: string; stage: string };
export type TaskNoteRecord = { title: string; description: string; level: "important" | "warning" | "risk" };
export type Task = {
  id: string; title: string; description: string; goal: string; completed: boolean;
  priority: "low" | "medium" | "high"; durationHours: number;
  steps: TaskStep[]; type?: string; objective?: string; completionCriteria?: string[]; domainMap?: TaskDomainMap; resources?: TaskResources; resourceRecords?: TaskResourceRecord[]; coreQuestions?: string[]; notes?: string; noteRecords?: TaskNoteRecord[]; mindMap?: TaskMindMap; deadline?: string; dailyReusable?: boolean; lastResetDate?: string;
};
type LegacyStep = Partial<TaskStep> & { minutes?: number };
type MigratableTask = Omit<Task, "steps" | "durationHours" | "goal"> & {
  steps: LegacyStep[] | number; durationHours?: number; durationMinutes?: number;
  goal?: string;
};
type IdFactory = (index: number) => string;
const defaultId: IdFactory = () => crypto.randomUUID();

export const normalizeHours = (hours: number) =>
  Math.max(0.25, Math.round((Number(hours) || 0) * 4) / 4);

export function createSteps(count: number, totalHours: number, idFactory: IdFactory = defaultId): TaskStep[] {
  const safeCount = Math.max(1, Math.round(count));
  const totalQuarters = Math.max(safeCount, Math.round(totalHours * 4));
  const base = Math.floor(totalQuarters / safeCount);
  const remainder = totalQuarters - base * safeCount;
  return Array.from({ length: safeCount }, (_, index) => ({
    id: idFactory(index + 1), title: `步骤 ${index + 1}`,
    hours: (base + (index < remainder ? 1 : 0)) / 4, completed: false,
  }));
}

export function migrateTask(task: MigratableTask, idFactory: IdFactory = defaultId): Task {
  const fallbackHours = normalizeHours(task.durationHours ?? (task.durationMinutes || 60) / 60);
  const steps = (Array.isArray(task.steps)
    ? task.steps.map((step, index) => ({
        id: step.id || idFactory(index + 1),
        title: step.title?.trim() || `步骤 ${index + 1}`,
        hours: normalizeHours(step.hours ?? (step.minutes || 15) / 60),
        completed: Boolean(step.completed), questions: Array.isArray(step.questions) ? step.questions.filter((item) => typeof item === "string" && item.trim()) : [],
      }))
    : createSteps(task.steps, fallbackHours, idFactory)).map((step) => ({ ...step, questions: step.questions || [] }));
  const { durationMinutes: _legacyMinutes, ...current } = task;
  const map = task.mindMap?.nodes?.length ? task.mindMap : { nodes: [{ id: "prerequisites", label: "前置知识", x: 40, y: 160 }, { id: "core", label: "核心概念", x: 260, y: 80 }, { id: "advanced", label: "进阶方向", x: 260, y: 250 }], edges: [{ id: "prerequisites-core", source: "prerequisites", target: "core" }, { id: "core-advanced", source: "core", target: "advanced" }] };
  return { ...current, goal: task.goal?.trim() || "", type: task.type?.trim() || "未分类", objective: task.objective?.trim() || task.goal?.trim() || "", completionCriteria: task.completionCriteria || [], domainMap: { prerequisites: task.domainMap?.prerequisites || [], coreConcepts: task.domainMap?.coreConcepts || [], advancedTopics: task.domainMap?.advancedTopics || [] }, resources: { systemResources: task.resources?.systemResources || [], externalRecommendations: { websites: task.resources?.externalRecommendations?.websites || [], upMasters: task.resources?.externalRecommendations?.upMasters || [], communities: task.resources?.externalRecommendations?.communities || [] } }, resourceRecords: task.resourceRecords || [], coreQuestions: task.coreQuestions || [], notes: task.notes || "", noteRecords: task.noteRecords || [], mindMap: map, dailyReusable: Boolean(task.dailyReusable), lastResetDate: task.lastResetDate, steps, durationHours: taskDuration(steps), completed: taskProgress(steps).done };
}

export function taskProgress(steps: TaskStep[]) {
  const completed = steps.filter((step) => step.completed).length;
  const total = steps.length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0, done: total > 0 && completed === total };
}
export const toggleStep = (steps: TaskStep[], id: string) =>
  steps.map((step) => step.id === id ? { ...step, completed: !step.completed } : step);
export const toggleAllSteps = (steps: TaskStep[], completed: boolean) =>
  steps.map((step) => ({ ...step, completed }));
export const updateStep = (steps: TaskStep[], id: string, updates: Partial<Pick<TaskStep, "title" | "hours">>) =>
  steps.map((step) => step.id === id ? {
    ...step,
    title: updates.title === undefined ? step.title : updates.title.trim() || step.title,
    hours: updates.hours === undefined ? step.hours : normalizeHours(updates.hours),
  } : step);
export const taskDuration = (steps: TaskStep[]) =>
  steps.reduce((total, step) => total + step.hours, 0);
