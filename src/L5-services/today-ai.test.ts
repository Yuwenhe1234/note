import { beforeEach, expect, it, vi } from "vitest";
import { saveBrowserAiConfig } from "./browser-ai-client";
import { generateTodayTodos } from "./today-ai";

beforeEach(() => localStorage.clear());

it("generates web todos with visitor AI instead of a local API route", async () => {
  saveBrowserAiConfig({ provider: "custom", baseUrl: "https://ai.example/v1", model: "demo", apiKey: "key", enabled: true });
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '["一","二","三"]' } }] }), { status: 200 }));
  await expect(generateTodayTodos([], { serverAi: false, fetcher })).resolves.toEqual(["一", "二", "三"]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
