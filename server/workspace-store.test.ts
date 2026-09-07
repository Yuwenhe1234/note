import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createWorkspaceStore } from "./workspace-store";

const snapshot = (revision = 0) => ({ version: 1 as const, revision, updatedAt: "", tasks: [], todayTodos: [], settings: { version: 1 }, editableText: { siteName: "东非大裂谷", heroEyebrow: "A", heroTitle: "B", heroDescription: "C", todayFocus: "D" } });

describe("workspace store", () => {
  it("returns null when no workspace exists and persists a snapshot", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workspace-"));
    const store = createWorkspaceStore(join(dir, "workspace.json"));
    expect(await store.load()).toBeNull();
    const saved = await store.save(snapshot());
    expect(saved.revision).toBe(1);
    expect((await store.load())?.editableText.siteName).toBe("东非大裂谷");
  });
  it("recovers from the backup file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workspace-"));
    const file = join(dir, "workspace.json");
    const store = createWorkspaceStore(file);
    await store.save(snapshot()); await store.save({ ...snapshot(1), editableText: { ...snapshot().editableText, siteName: "新名称" } });
    await writeFile(file, "broken", "utf8");
    expect((await store.load())?.editableText.siteName).toBe("东非大裂谷");
    expect(JSON.parse(await readFile(`${file}.backup`, "utf8")).version).toBe(1);
  });
  it("round-trips desktopWidget settings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workspace-"));
    const store = createWorkspaceStore(join(dir, "workspace.json"));
    await store.save({
      ...snapshot(),
      desktopWidget: { todayEnabled: false, tasksEnabled: true, todayLimit: 3, tasksLimit: 2, opacity: 80 },
    });
    expect((await store.load())?.desktopWidget).toEqual({
      todayEnabled: false,
      tasksEnabled: true,
      todayLimit: 3,
      tasksLimit: 2,
      opacity: 80,
    });
  });
});
