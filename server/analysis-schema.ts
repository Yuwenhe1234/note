export type AnalysisStep = {
  title: string;
  hours: number;
  description: string;
  completionCriteria: string;
  questions?: string[];
};
export type Analysis = {
  summary: string;
  goal: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
  steps: AnalysisStep[];
  type?: string;
  domainMap?: { prerequisites: string[]; coreConcepts: string[]; advancedTopics: string[] };
  resources?: { systemResources: string[]; externalRecommendations: { websites: string[]; upMasters: string[]; communities: string[] } };
  coreQuestions?: string[];
  structuredGoal?: { description: string; completionCriteria: string[] };
  flowchart?: { nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] };
  resourceRecords?: { name: string; platform: string; url: string; searchQuery: string; reason: string; stage: string }[];
  noteRecords?: { title: string; description: string; level: "important" | "warning" | "risk" }[];
};

const isQuarterHour = (value: number) => Number.isFinite(value) && value >= 0.25 && value <= 100 && Number.isInteger(value * 4);

export function parseAnalysis(raw: string): Analysis {
  let data: Analysis;
  try {
    data = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new Error("分析结果不是有效 JSON");
  }
  const stepsValid = Array.isArray(data.steps) && data.steps.length >= 1 && data.steps.length <= 100 && data.steps.every((step) =>
    typeof step.title === "string" && step.title.trim().length > 0 && step.title.trim().length <= 24 &&
    isQuarterHour(step.hours) && typeof step.description === "string" && step.description.trim() &&
    typeof step.completionCriteria === "string" && step.completionCriteria.trim(),
  );
  const total = stepsValid ? data.steps.reduce((sum, step) => sum + step.hours, 0) : 0;
  const rawGoal = data.goal as unknown;
  const structuredGoal = typeof rawGoal === "object" && rawGoal !== null ? rawGoal as { description?: unknown; completionCriteria?: unknown } : undefined;
  const goalText = typeof rawGoal === "string" ? rawGoal.trim() : typeof structuredGoal?.description === "string" ? structuredGoal.description.trim() : "";
  const valid = typeof data.summary === "string" && data.summary.trim() && goalText && goalText.length <= 160 &&
    ["high", "medium", "low"].includes(data.priority) && isQuarterHour(data.estimatedHours) &&
    stepsValid && Math.abs(total - data.estimatedHours) < 0.001;
  if (!valid) throw new Error("分析结果格式异常：时长或步骤不符合要求");
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
  if (data.type !== undefined && !["学习类", "开发/项目类", "写作/内容类", "规划/准备类", "生活/习惯类"].includes(data.type)) throw new Error("分析结果类型不符合要求");
  data.goal = goalText;
  data.structuredGoal = { description: goalText, completionCriteria: strings(structuredGoal?.completionCriteria) };
  data.type = data.type?.trim() || "未分类";
  data.domainMap = { prerequisites: strings(data.domainMap?.prerequisites), coreConcepts: strings(data.domainMap?.coreConcepts), advancedTopics: strings(data.domainMap?.advancedTopics) };
  data.resources = { systemResources: strings(data.resources?.systemResources), externalRecommendations: { websites: strings(data.resources?.externalRecommendations?.websites), upMasters: strings(data.resources?.externalRecommendations?.upMasters), communities: strings(data.resources?.externalRecommendations?.communities) } };
  data.coreQuestions = strings(data.coreQuestions).slice(0, 10);
  data.steps = data.steps.map((step) => ({ ...step, questions: strings(step.questions) }));
  const records = Array.isArray((data as any).resources) ? (data as any).resources : [];
  data.resourceRecords = records.filter((item: any) => item && typeof item.name === "string" && typeof item.platform === "string" && typeof item.searchQuery === "string" && typeof item.reason === "string" && typeof item.stage === "string" && (item.url === "" || /^https?:\/\//.test(item.url))).map((item: any) => ({ name: item.name.trim(), platform: item.platform.trim(), url: item.url.trim(), searchQuery: item.searchQuery.trim(), reason: item.reason.trim(), stage: item.stage.trim() }));
  const flow = (data as any).flowchart;
  data.flowchart = { nodes: Array.isArray(flow?.nodes) ? flow.nodes.filter((node: any) => typeof node?.id === "string" && typeof node?.label === "string").map((node: any) => ({ id: node.id.trim(), label: node.label.trim() })) : [], edges: Array.isArray(flow?.edges) ? flow.edges.filter((edge: any) => typeof edge?.from === "string" && typeof edge?.to === "string").map((edge: any) => ({ from: edge.from.trim(), to: edge.to.trim() })) : [] };
  if (data.flowchart.edges.some((edge) => !data.flowchart!.nodes.some((node) => node.id === edge.from) || !data.flowchart!.nodes.some((node) => node.id === edge.to))) throw new Error("流程图连线引用了不存在节点");
  data.noteRecords = Array.isArray((data as any).notes) ? (data as any).notes.filter((note: any) => note && typeof note.title === "string" && typeof note.description === "string" && ["important", "warning", "risk"].includes(note.level)).map((note: any) => ({ title: note.title.trim(), description: note.description.trim(), level: note.level })) : [];
  return data;
}
