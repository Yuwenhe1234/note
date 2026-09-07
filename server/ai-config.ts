import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type ProviderId = "openai" | "deepseek" | "qwen" | "zhipu" | "custom";

export type AiConfig = {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
};

export type PublicAiConfig = Omit<AiConfig, "apiKey"> & { hasApiKey: boolean };
type StoredProfile = AiConfig & { id: string };
type StoredAiConfig = { activeProfileId: string; profiles: StoredProfile[] };

const EMPTY_CONFIG: AiConfig = { provider: "openai", apiKey: "", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", enabled: false };

export function createConfigStore(filePath: string) {
  async function loadStore(): Promise<StoredAiConfig> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.profiles)) return parsed;
      const legacy = { ...EMPTY_CONFIG, ...parsed } as AiConfig;
      const id = legacy.provider;
      return { activeProfileId: id, profiles: [{ ...legacy, id }] };
    } catch {
      return { activeProfileId: "openai", profiles: [{ ...EMPTY_CONFIG, id: "openai" }] };
    }
  }

  async function load(): Promise<AiConfig> {
    const stored = await loadStore();
    const profile = stored.profiles.find((item) => item.id === stored.activeProfileId) || stored.profiles[0];
    const { id: _id, ...config } = profile;
    return config;
  }

  async function save(config: AiConfig): Promise<void> {
    const stored = await loadStore();
    const id = config.provider === "custom" ? `custom:${config.baseUrl}:${config.model}` : config.provider;
    const nextProfile = { ...config, id };
    const profiles = stored.profiles.some((item) => item.id === id) ? stored.profiles.map((item) => item.id === id ? nextProfile : item) : [...stored.profiles.filter((item) => !(item.id === "openai" && !item.apiKey && stored.profiles.length === 1)), nextProfile];
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify({ activeProfileId: id, profiles }, null, 2), "utf8");
  }

  async function loadPublic(): Promise<PublicAiConfig> {
    const { apiKey, ...config } = await load();
    return { ...config, hasApiKey: Boolean(apiKey) };
  }

  return { load, loadStore, save, loadPublic };
}
