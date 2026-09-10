import { generateTodayInBrowser } from "./browser-ai-client";
import { runtimeCapabilities } from "./runtime-capabilities";

export async function generateTodayTodos(tasks: unknown[], options: { serverAi?: boolean; fetcher?: typeof fetch } = {}): Promise<string[]> {
  if ((options.serverAi ?? runtimeCapabilities.serverAi) === false) {
    return generateTodayInBrowser(tasks, { fetcher: options.fetcher });
  }
  const response = await (options.fetcher ?? fetch)("/api/generate-today", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tasks }) });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "AI 生成失败");
  return result.data;
}
