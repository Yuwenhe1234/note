import type { Plugin } from "vite";
import { join } from "node:path";
import { createConfigStore } from "./ai-config.js";
import { collectSourcePage, validatePlatformSourceUrl } from "./news-adapters.js";
import { refreshNewsSources } from "./news-service.js";
import type { CollectedContent, NewsContentBasis, RefreshSource } from "./news-types.js";
import { createNewsBrowser } from "./news-browser.js";

const configStore = createConfigStore(join(process.cwd(), ".local", "ai-config.json"));
const newsBrowser = createNewsBrowser({ profileDir: join(process.cwd(), ".local", "news-browser-profile") });
const readBody = (request: NodeJS.ReadableStream) => new Promise<string>((resolve, reject) => { let body = ""; request.on("data", (part) => body += part); request.on("end", () => resolve(body)); request.on("error", reject); });
const send = (response: any, status: number, data: unknown) => { response.statusCode = status; response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify(data)); };
const parseJson = (value: string) => JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());

async function summarize(content: CollectedContent) {
  const config = await configStore.load();
  if (!config.enabled || !config.apiKey) throw new Error("请先在设置中配置 AI 与 API");
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model, temperature: 0.2, messages: [{ role: "system", content: "你是信息摘要助手。只能根据提供的原始内容总结，不得补充、猜测或编造未出现的信息。只返回严格 JSON：{\"summary\":\"一句话总结\",\"coreContent\":[\"核心内容\"],\"highlights\":[\"重点信息\"],\"whyItMatters\":\"值得关注\"}。coreContent 和 highlights 各 3 到 5 条。" }, { role: "user", content: `标题：${content.title}\n来源：${content.sourceName}\n原始内容：${content.transcript || content.text || "无可用正文"}` }] }) });
      if (!result.ok) throw new Error(`模型请求失败 (${result.status})`);
      const payload: any = await result.json();
      const parsed = parseJson(payload.choices?.[0]?.message?.content || "");
      if (typeof parsed.summary !== "string" || !Array.isArray(parsed.coreContent) || !Array.isArray(parsed.highlights) || typeof parsed.whyItMatters !== "string") throw new Error("AI 摘要格式异常");
      const strings = (entries: unknown[]) => entries.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())).map((entry) => entry.trim()).slice(0, 5);
      const contentBasis: NewsContentBasis = content.transcript ? "视频字幕" : content.platform === "website" ? "网页正文" : "视频简介";
      return { summary: parsed.summary.trim(), coreContent: strings(parsed.coreContent), highlights: strings(parsed.highlights), whyItMatters: parsed.whyItMatters.trim(), contentBasis };
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

export function newsRoutes(): Plugin {
  return { name: "memo-agent-news-routes", configureServer(server) {
    server.httpServer?.once("close", () => { void newsBrowser.close(); });
    server.middlewares.use(async (request, response, next) => {
      if (request.url === "/api/news/login" && request.method === "POST") {
        try {
          const input = JSON.parse(await readBody(request)) as { url?: string };
          if (!input.url) return send(response, 400, { ok: false, error: "登录地址无效" });
          validatePlatformSourceUrl(input.url);
          await newsBrowser.openLogin(input.url);
          return send(response, 200, { ok: true });
        } catch (error) { return send(response, 500, { ok: false, error: error instanceof Error ? error.message : "登录窗口打开失败" }); }
      }
      if (request.url !== "/api/news/refresh" || request.method !== "POST") return next();
      try {
        const input = JSON.parse(await readBody(request)) as { sources?: RefreshSource[]; knownKeys?: string[] };
        if (!Array.isArray(input.sources)) return send(response, 400, { ok: false, error: "订阅来源格式错误" });
        const data = await refreshNewsSources({ sources: input.sources.slice(0, 50), knownKeys: Array.isArray(input.knownKeys) ? input.knownKeys : [], collect: (source) => collectSourcePage(source, fetch, (url) => newsBrowser.render(url)), summarize });
        return send(response, 200, { ok: true, data });
      } catch (error) { return send(response, 500, { ok: false, error: error instanceof Error ? error.message : "今日消息服务异常" }); }
    });
  } };
}
