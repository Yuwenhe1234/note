import { describe, expect, it } from "vitest";
import { createBackup, parseBackup } from "./backup-schema";
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
});
