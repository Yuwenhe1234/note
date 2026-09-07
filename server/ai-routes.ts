import type { Plugin } from "vite";
import { join } from "node:path";
import { createConfigStore, type AiConfig } from "./ai-config.js";
import { parseAnalysis } from "./analysis-schema.js";

const store = createConfigStore(
  join(process.cwd(), ".local", "ai-config.json"),
);
const readBody = async (request: NodeJS.ReadableStream) =>
  new Promise<string>((resolve, reject) => {
    let body = "";
    request.on("data", (part) => (body += part));
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
const send = (response: any, status: number, data: unknown) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(data));
};
const endpoint = (config: AiConfig) =>
  `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

export function aiRoutes(): Plugin {
  return {
    name: "memo-agent-ai-routes",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/api/")) return next();
        try {
          if (request.url === "/api/ai/config" && request.method === "GET")
            return send(response, 200, {
              ok: true,
              data: await store.loadPublic(),
            });
          if (request.url === "/api/ai/config" && request.method === "PUT") {
            const input = JSON.parse(await readBody(request));
            const current = await store.load();
            await store.save({
              ...current,
              ...input,
              apiKey: input.apiKey?.trim() || current.apiKey,
            });
            return send(response, 200, {
              ok: true,
              data: await store.loadPublic(),
            });
          }
          if (request.url === "/api/ai/test" && request.method === "POST") {
            const config = await store.load();
            if (!config.enabled || !config.apiKey)
              return send(response, 400, {
                ok: false,
                error: "请先启用 AI 分析并填写 API Key",
              });
            const result = await fetch(endpoint(config), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.apiKey}`,
              },
              body: JSON.stringify({
                model: config.model,
                messages: [{ role: "user", content: "Reply with OK" }],
                max_tokens: 8,
              }),
            });
            return send(
              response,
              result.ok ? 200 : result.status,
              result.ok
                ? { ok: true }
                : { ok: false, error: `连接失败 (${result.status})` },
            );
          }
          if (
            request.url === "/api/generate-today" &&
            request.method === "POST"
          ) {
            const input = JSON.parse(await readBody(request));
            const config = await store.load();
            if (!config.enabled || !config.apiKey) return send(response, 400, { ok: false, error: "请先在设置中配置 AI 与 API" });
            const progress = (input.tasks || []).map((task: any) => ({ title: task.title, priority: task.priority, completed: task.completed, progress: task.steps?.length ? `${task.steps.filter((step: any) => step.completed).length}/${task.steps.length}` : "0/0", goal: task.goal })).slice(0, 20);
            const result = await fetch(endpoint(config), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: "你是今日待办规划助手。" }, { role: "user", content: `根据以下任务清单进度，生成 3 条独立的、简短可执行的今日待办。只返回 JSON 字符串数组，例如 ["待办一","待办二","待办三"]。${JSON.stringify(progress)}` }], temperature: 0.3 }) });
            if (!result.ok) return send(response, result.status, { ok: false, error: `模型请求失败 (${result.status})` });
            const payload = await result.json() as any;
            const data = JSON.parse(payload.choices?.[0]?.message?.content || "[]");
            if (!Array.isArray(data) || !data.length || !data.every((item) => typeof item === "string" && item.trim())) throw new Error("AI 返回的今日待办格式异常");
            return send(response, 200, { ok: true, data: data.slice(0, 3).map((item) => item.trim()) });
          }
          if (
            request.url === "/api/analyze-task" &&
            request.method === "POST"
          ) {
            const input = JSON.parse(await readBody(request));
            const config = await store.load();
            if (!config.enabled || !config.apiKey)
              return send(response, 400, {
                ok: false,
                error: "AI 分析未配置，请到设置 → AI 与 API 完成配置",
              });
            const prompt = `请把任务拆成具体可执行步骤，只返回 JSON，不要 Markdown：{"summary":"简短总结","goal":"清晰可验证且不超过80字的完成目标","priority":"high|medium|low","estimatedHours":1.5,"steps":[{"title":"不超过24字","hours":0.5,"description":"如何执行","completionCriteria":"可验证的完成标准"}]}。要求：goal 描述完成后达到的具体效果；步骤 ${input.minSteps || 2}-${input.maxSteps || 8} 个；hours 必须是 0.25 的倍数且单步不超过 4 小时；estimatedHours 必须严格等于所有步骤 hours 之和；步骤应具体、无重复、可勾选完成。任务名称：${input.title}\n任务内容：${input.description || "无"}\n期望时长：${input.duration || "2-3 小时"}\n注意事项：${input.notes || "无"}`;
            let lastError: unknown;
            for (let attempt = 0; attempt < 2; attempt += 1) {
              const result = await fetch(endpoint(config), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
                body: JSON.stringify({
                  model: config.model,
                  messages: [
                    { role: "system", content: "你是严谨的任务规划助手，必须严格遵守 JSON schema 与时长约束。" },
                    { role: "user", content: attempt === 0 ? prompt : `${prompt}\n上一次输出格式或时长校验失败，请修正后重新输出。` },
                  ],
                  temperature: 0.2,
                }),
              });
              if (!result.ok) return send(response, result.status, { ok: false, error: `模型请求失败 (${result.status})` });
              const payload = (await result.json()) as any;
              try {
                return send(response, 200, { ok: true, data: parseAnalysis(payload.choices?.[0]?.message?.content || "") });
              } catch (error) { lastError = error; }
            }
            throw lastError;
          }
          return send(response, 404, { ok: false, error: "API 路径不存在" });
        } catch (error) {
          return send(response, 500, {
            ok: false,
            error: error instanceof Error ? error.message : "本地 AI 服务异常",
          });
        }
      });
    },
  };
}
