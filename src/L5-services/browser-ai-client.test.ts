import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatCompletion, loadBrowserAiConfig, saveBrowserAiConfig } from "./browser-ai-client";

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
});
