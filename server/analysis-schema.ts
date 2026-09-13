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
  const valid = typeof data.summary === "string" && data.summary.trim() && typeof data.goal === "string" && data.goal.trim() && data.goal.trim().length <= 80 &&
    ["high", "medium", "low"].includes(data.priority) && isQuarterHour(data.estimatedHours) &&
    stepsValid && Math.abs(total - data.estimatedHours) < 0.001;
  if (!valid) throw new Error("分析结果格式异常：时长或步骤不符合要求");
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
  data.type = typeof data.type === "string" && data.type.trim() ? data.type.trim() : "未分类";
  data.domainMap = { prerequisites: strings(data.domainMap?.prerequisites), coreConcepts: strings(data.domainMap?.coreConcepts), advancedTopics: strings(data.domainMap?.advancedTopics) };
  data.resources = { systemResources: strings(data.resources?.systemResources), externalRecommendations: { websites: strings(data.resources?.externalRecommendations?.websites), upMasters: strings(data.resources?.externalRecommendations?.upMasters), communities: strings(data.resources?.externalRecommendations?.communities) } };
  data.coreQuestions = strings(data.coreQuestions).slice(0, 10);
  data.steps = data.steps.map((step) => ({ ...step, questions: strings(step.questions) }));
  return data;
}
