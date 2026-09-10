import { analyzeTaskInBrowser } from "../../../L5-services/browser-ai-client";
import { runtimeCapabilities } from "../../../L5-services/runtime-capabilities";

export type TaskAnalysis = {
  summary: string;
  goal: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
  steps: { title: string; hours: number; description: string; completionCriteria: string }[];
};
export type AnalyzeTaskInput = {
  title: string;
  description: string;
  duration?: string;
  notes?: string;
  minSteps?: number;
  maxSteps?: number;
};
export async function analyzeTask(input: AnalyzeTaskInput, options: { serverAi?: boolean; fetcher?: typeof fetch } = {}): Promise<TaskAnalysis> {
  if ((options.serverAi ?? runtimeCapabilities.serverAi) === false) {
    return analyzeTaskInBrowser(input, { fetcher: options.fetcher });
  }
  const response = await fetch("/api/analyze-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "AI 分析失败");
  return result.data;
}
