import { describe, expect, it } from "vitest";
import { createBackup, parseBackup, restoreBrowserBackup } from "./backup-schema";
import { DEFAULT_SETTINGS } from "./settings-repository";

describe("backup schema", () => {
  it("exports tasks and settings without API keys", () => {
    const backup = createBackup([{ id: "1", title: "任务", completed: false }], DEFAULT_SETTINGS);
    expect(backup.tasks).toHaveLength(1);
    expect(JSON.stringify(backup)).not.toContain("apiKey");
  });
  it("rejects malformed backups", () => {
    expect(() => parseBackup('{"version":1,"tasks":"bad"}')).toThrow("备份格式不正确");
  });
  it("round-trips hour steps and still accepts legacy minute data", () => {
    const current = createBackup([{
      id: "new", title: "新任务", completed: false, durationHours: 0.75,
      steps: [{ id: "s", title: "执行", hours: 0.75, completed: false }],
    }], DEFAULT_SETTINGS);
    expect(parseBackup(JSON.stringify(current)).tasks[0].steps).toEqual(current.tasks[0].steps);
    const legacy = { ...current, tasks: [{
      id: "old", title: "旧任务", completed: false, durationMinutes: 30,
      steps: [{ id: "s", title: "执行", minutes: 30, completed: false }],
    }] };
    expect(parseBackup(JSON.stringify(legacy)).tasks[0].durationMinutes).toBe(30);
  });
  it("round-trips a completion goal", () => {
    const backup = createBackup([{ id: "g", title: "任务", completed: false, goal: "完成验收" }], DEFAULT_SETTINGS);
    expect(parseBackup(JSON.stringify(backup)).tasks[0].goal).toBe("完成验收");
  });
  it("round-trips browser workspace, news and non-secret AI metadata", () => {
    const backup = createBackup([], DEFAULT_SETTINGS, {
      workspace: { version: 1, revision: 2, updatedAt: "now", tasks: [], todayTodos: [], settings: DEFAULT_SETTINGS, editableText: { siteName: "站点", heroEyebrow: "", heroTitle: "", heroDescription: "", todayFocus: "" } },
      news: { version: 1, sources: [], items: [], fingerprints: [] },
      ai: { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt", enabled: true, apiKey: "must-not-export" },
    });
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.version).toBe(2);
    expect(parsed.workspace?.revision).toBe(2);
    expect(parsed.news).toMatchObject({ version: 1 });
    expect(parsed.ai).toEqual({ provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt", enabled: true });
    expect(JSON.stringify(parsed)).not.toContain("must-not-export");
  });
  it("rejects malformed nested version 2 data", () => {
    expect(() => parseBackup(JSON.stringify({ version: 2, exportedAt: "now", tasks: [], settings: DEFAULT_SETTINGS, workspace: { version: 9 }, news: { version: 1, sources: "bad", items: [], fingerprints: [] } }))).toThrow("备份格式不正确");
  });
  it("rejects malformed members inside browser arrays", () => {
    const base = createBackup([], DEFAULT_SETTINGS, { workspace: { version: 1, revision: 0, updatedAt: "", tasks: [], todayTodos: [], settings: DEFAULT_SETTINGS, editableText: { siteName: "站点", heroEyebrow: "", heroTitle: "", heroDescription: "", todayFocus: "" } }, news: { version: 1, sources: [], items: [], fingerprints: [] } });
    expect(() => parseBackup(JSON.stringify({ ...base, workspace: { ...base.workspace, tasks: [null] } }))).toThrow("备份格式不正确");
    expect(() => parseBackup(JSON.stringify({ ...base, workspace: { ...base.workspace, todayTodos: [null] } }))).toThrow("备份格式不正确");
    expect(() => parseBackup(JSON.stringify({ ...base, news: { ...base.news, sources: [null] } }))).toThrow("备份格式不正确");
    expect(() => parseBackup(JSON.stringify({ ...base, news: { ...base.news, items: [null] } }))).toThrow("备份格式不正确");
    expect(() => parseBackup(JSON.stringify({ ...base, workspace: { ...base.workspace, editableText: {} } }))).toThrow("备份格式不正确");
  });
  it("rolls back browser keys when an import write fails", () => {
    const values = new Map([["memo-agent-workspace-v1", "old-workspace"], ["memo-agent-news-v1", "old-news"]]);
    let writes = 0;
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { writes += 1; if (writes === 2) throw new DOMException("full", "QuotaExceededError"); values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    } as unknown as Storage;
    const backup = createBackup([], DEFAULT_SETTINGS, { workspace: { version: 1, revision: 0, updatedAt: "", tasks: [], todayTodos: [], settings: DEFAULT_SETTINGS, editableText: { siteName: "站点", heroEyebrow: "", heroTitle: "", heroDescription: "", todayFocus: "" } }, news: { version: 1, sources: [], items: [], fingerprints: [] } });
    expect(() => restoreBrowserBackup(backup, storage)).toThrow("备份导入失败，原有数据已恢复");
    expect(values.get("memo-agent-workspace-v1")).toBe("old-workspace");
    expect(values.get("memo-agent-news-v1")).toBe("old-news");
  });
});
