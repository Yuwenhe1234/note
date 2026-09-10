import { parseAnalysis, type Analysis } from "../../server/analysis-schema";

export type BrowserAiConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
};
export type AiMessage = { role: "system" | "user"; content: string };
export type NewsSummary = { summary: string; coreContent: string[]; highlights: string[]; whyItMatters: string };
export const BROWSER_AI_CONFIG_KEY = "memo-agent-ai-config-v1";
const EMPTY: BrowserAiConfig = { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", apiKey: "", enabled: false };

export function loadBrowserAiConfig(storage: Storage = localStorage): BrowserAiConfig {
  try { return { ...EMPTY, ...JSON.parse(storage.getItem(BROWSER_AI_CONFIG_KEY) || "{}") }; }
  catch { return { ...EMPTY }; }
}

export function saveBrowserAiConfig(config: BrowserAiConfig, storage: Storage = localStorage): void {
  storage.setItem(BROWSER_AI_CONFIG_KEY, JSON.stringify(config));
}

export async function chatCompletion(messages: AiMessage[], options: { storage?: Storage; fetcher?: typeof fetch; temperature?: number } = {}): Promise<string> {
  const config = loadBrowserAiConfig(options.storage);
  if (!config.enabled || !config.apiKey.trim() || !config.baseUrl.trim() || !config.model.trim()) throw new Error("请先配置 AI 服务");
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages, temperature: options.temperature ?? 0.2 }),
    });
  } catch {
    throw new Error("无法连接 AI 服务；该服务商可能不允许浏览器跨域访问");
  }
  if (response.status === 401 || response.status === 403) throw new Error("API Key 无效或无权访问");
  if (response.status === 429) throw new Error("AI 服务请求过于频繁");
  if (!response.ok) throw new Error(`AI 服务请求失败（${response.status}）`);
  try {
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error();
    return content.trim();
  } catch { throw new Error("AI 服务返回了无效数据"); }
}

export async function testBrowserAiConnection(options: { storage?: Storage; fetcher?: typeof fetch } = {}): Promise<void> {
  await chatCompletion([{ role: "user", content: "只回复 OK" }], { ...options, temperature: 0 });
}

export async function analyzeTaskInBrowser(input: Record<string, unknown>): Promise<Analysis> {
  const raw = await chatCompletion([
    { role: "system", content: "你是任务规划助手。只返回严格 JSON，包含 summary、goal、priority、estimatedHours、steps；steps 每项包含 title、hours、description、completionCriteria。步骤 2-8 个，时长以 0.25 小时为刻度且总和等于 estimatedHours。" },
    { role: "user", content: JSON.stringify(input) },
  ]);
  return parseAnalysis(raw);
}

export async function generateTodayInBrowser(tasks: unknown[]): Promise<string[]> {
  const raw = await chatCompletion([
    { role: "system", content: "你是今日待办规划助手。" },
    { role: "user", content: `根据任务清单生成 3 条简短可执行的今日待办，只返回 JSON 字符串数组：${JSON.stringify(tasks)}` },
  ], { temperature: 0.3 });
  try {
    const value: unknown = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error();
    return value.slice(0, 3);
  } catch { throw new Error("AI 服务返回了无效数据"); }
}

export async function summarizeNewsInBrowser(input: { title: string; body: string }): Promise<NewsSummary> {
  const raw = await chatCompletion([
    { role: "system", content: "只根据原文总结，不得编造。只返回 JSON：{\"summary\":\"一句话\",\"coreContent\":[\"核心内容\"],\"highlights\":[\"重点\"],\"whyItMatters\":\"价值\"}。" },
    { role: "user", content: `标题：${input.title}\n原文：${input.body}` },
  ]);
  try {
    const value = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    if (typeof value.summary !== "string" || !Array.isArray(value.coreContent) || !Array.isArray(value.highlights) || typeof value.whyItMatters !== "string") throw new Error();
    return value;
  } catch { throw new Error("AI 服务返回了无效数据"); }
}
