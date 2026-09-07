import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConfigStore } from "./ai-config";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("AI configuration store", () => {
  it("saves the key locally but never returns it to the browser", async () => {
    const directory = await mkdtemp(join(tmpdir(), "memo-agent-ai-"));
    temporaryDirectories.push(directory);
    const store = createConfigStore(join(directory, "ai-config.json"));

    await store.save({ provider: "deepseek", apiKey: "sk-secret", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", enabled: true });

    expect(await store.load()).toMatchObject({ provider: "deepseek", apiKey: "sk-secret", enabled: true });
    expect(await store.loadPublic()).toEqual({ provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", enabled: true, hasApiKey: true });
  });
  it("keeps credentials for multiple providers while switching the active profile", async () => {
    const directory = await mkdtemp(join(tmpdir(), "memo-agent-ai-"));
    temporaryDirectories.push(directory);
    const store = createConfigStore(join(directory, "ai-config.json"));
    await store.save({ provider: "openai", apiKey: "openai-secret", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", enabled: true });
    await store.save({ provider: "deepseek", apiKey: "deepseek-secret", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", enabled: true });
    expect((await store.loadStore()).profiles).toHaveLength(2);
    expect(await store.load()).toMatchObject({ provider: "deepseek", apiKey: "deepseek-secret" });
    expect(JSON.stringify(await store.loadPublic())).not.toContain("secret");
  });
});
