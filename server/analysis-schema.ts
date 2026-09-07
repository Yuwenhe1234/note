export type AnalysisStep = {
  title: string;
  hours: number;
  description: string;
  completionCriteria: string;
};
export type Analysis = {
  summary: string;
  goal: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
  steps: AnalysisStep[];
};

const isQuarterHour = (value: number) => Number.isFinite(value) && value >= 0.25 && value <= 4 && Number.isInteger(value * 4);

export function parseAnalysis(raw: string): Analysis {
  let data: Analysis;
  try {
    data = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new Error("分析结果不是有效 JSON");
  }
  const stepsValid = Array.isArray(data.steps) && data.steps.length >= 2 && data.steps.length <= 8 && data.steps.every((step) =>
    typeof step.title === "string" && step.title.trim().length > 0 && step.title.trim().length <= 24 &&
    isQuarterHour(step.hours) && typeof step.description === "string" && step.description.trim() &&
    typeof step.completionCriteria === "string" && step.completionCriteria.trim(),
  );
  const total = stepsValid ? data.steps.reduce((sum, step) => sum + step.hours, 0) : 0;
  const valid = typeof data.summary === "string" && data.summary.trim() && typeof data.goal === "string" && data.goal.trim() && data.goal.trim().length <= 80 &&
    ["high", "medium", "low"].includes(data.priority) && isQuarterHour(data.estimatedHours) &&
    stepsValid && Math.abs(total - data.estimatedHours) < 0.001;
  if (!valid) throw new Error("分析结果格式异常：时长或步骤不符合要求");
  return data;
}
