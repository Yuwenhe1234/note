import type { AiConfig, ProviderId } from "./ai-config";

export type ProviderPreset = Pick<AiConfig, "provider" | "baseUrl" | "model"> & { label: string };

export const PROVIDERS: Record<ProviderId, ProviderPreset> = {
  openai: { provider: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  deepseek: { provider: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  qwen: { provider: "qwen", label: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  zhipu: { provider: "zhipu", label: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
  custom: { provider: "custom", label: "自定义兼容接口", baseUrl: "", model: "" },
};
