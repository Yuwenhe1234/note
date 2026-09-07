export type TaskAnalysis = {
  summary: string;
  goal: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
  steps: { title: string; hours: number; description: string; completionCriteria: string }[];
};
export async function analyzeTask(input: {
  title: string;
  description: string;
  duration?: string;
  notes?: string;
  minSteps?: number;
  maxSteps?: number;
}): Promise<TaskAnalysis> {
  const response = await fetch("/api/analyze-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "AI 分析失败");
  return result.data;
}
