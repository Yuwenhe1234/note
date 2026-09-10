import { beforeEach, expect, it, vi } from "vitest";
import { saveBrowserAiConfig } from "../../../L5-services/browser-ai-client";
import { analyzeTask } from "./analyze-task";

beforeEach(() => localStorage.clear());

it("analyzes through the visitor provider in static web mode", async () => {
  saveBrowserAiConfig({ provider: "custom", baseUrl: "https://ai.example/v1", model: "demo", apiKey: "key", enabled: true });
  const analysis = { summary: "总结", goal: "完成目标", priority: "medium", estimatedHours: 0.5, steps: [
    { title: "步骤一", hours: 0.25, description: "说明一", completionCriteria: "完成一" },
    { title: "步骤二", hours: 0.25, description: "说明二", completionCriteria: "完成二" },
  ] };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(analysis) } }] }), { status: 200 }));
  await expect(analyzeTask({ title: "测试", description: "测试描述" }, { serverAi: false, fetcher })).resolves.toMatchObject({ goal: "完成目标" });
  expect(fetcher).toHaveBeenCalledWith("https://ai.example/v1/chat/completions", expect.anything());
});
