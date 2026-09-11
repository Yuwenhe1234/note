import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeTaskInBrowser, chatCompletion, loadBrowserAiConfig, saveBrowserAiConfig } from "./browser-ai-client";

const config = { provider: "openai", baseUrl: "https://api.openai.com/v1/", model: "gpt-test", apiKey: "secret", enabled: true };

describe("browser AI client", () => {
  beforeEach(() => localStorage.clear());

  it("stores visitor credentials only in browser storage", () => {
    saveBrowserAiConfig(config, localStorage);
    expect(loadBrowserAiConfig(localStorage)).toEqual(config);
  });

  it("calls an OpenAI-compatible chat completion endpoint", async () => {
    saveBrowserAiConfig(config, localStorage);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    await expect(chatCompletion([{ role: "user", content: "hello" }], { storage: localStorage, fetcher })).resolves.toBe("ok");
    expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
  });

  it("maps missing configuration, authentication, throttling and network failures", async () => {
    await expect(chatCompletion([], { storage: localStorage })).rejects.toThrow("请先配置 AI 服务");
    saveBrowserAiConfig(config, localStorage);
    await expect(chatCompletion([], { storage: localStorage, fetcher: vi.fn().mockResolvedValue(new Response("", { status: 401 })) })).rejects.toThrow("API Key 无效或无权访问");
    await expect(chatCompletion([], { storage: localStorage, fetcher: vi.fn().mockResolvedValue(new Response("", { status: 429 })) })).rejects.toThrow("AI 服务请求过于频繁");
    await expect(chatCompletion([], { storage: localStorage, fetcher: vi.fn().mockRejectedValue(new TypeError("fetch failed")) })).rejects.toThrow("无法连接 AI 服务；该服务商可能不允许浏览器跨域访问");
  });

  it("uses category-aware workflows for browser task analysis", async () => {
    saveBrowserAiConfig(config, localStorage);
    const content = JSON.stringify({ summary: "学习计划", goal: "完成入门实践并通过自测", priority: "medium", estimatedHours: 2, steps: [{ title: "阅读官方入门文档", hours: 1, description: "建立知识框架", completionCriteria: "完成结构笔记" }, { title: "完成最小实践", hours: 1, description: "动手验证", completionCriteria: "示例运行成功" }] });
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }));
    await analyzeTaskInBrowser({ title: "学习 STM32", minSteps: 2, maxSteps: 7 }, { storage: localStorage, fetcher });
    const body = JSON.parse(fetcher.mock.calls[0][1].body as string);
    const prompt = body.messages.map((message: { content: string }) => message.content).join("\n");
    for (const category of ["学习类", "开发/项目类", "写作/内容类", "规划/准备类", "生活/习惯类"]) expect(prompt).toContain(category);
  });
});
