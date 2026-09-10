import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settings-repository";
import { loadWorkspace, saveWorkspace, type WorkspaceDataV1 } from "./workspace-repository";

const workspace = (): WorkspaceDataV1 => ({
  version: 1,
  revision: 0,
  updatedAt: "",
  tasks: [],
  todayTodos: [],
  settings: structuredClone(DEFAULT_SETTINGS),
  editableText: {
    siteName: "东非大裂谷",
    heroEyebrow: "PERSONAL AGENT WORKSPACE",
    heroTitle: "把想法变成清晰的行动。",
    heroDescription: "说明",
    todayFocus: "",
  },
});

describe("browser workspace repository", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty and restores a saved workspace with a new revision", async () => {
    await expect(loadWorkspace({ storage: localStorage, serverWorkspace: false })).resolves.toBeNull();
    const saved = await saveWorkspace(workspace(), { storage: localStorage, serverWorkspace: false });
    expect(saved.revision).toBe(1);
    await expect(loadWorkspace({ storage: localStorage, serverWorkspace: false })).resolves.toEqual(saved);
  });

  it("reports corrupted browser data", async () => {
    localStorage.setItem("memo-agent-workspace-v1", "not-json");
    await expect(loadWorkspace({ storage: localStorage, serverWorkspace: false })).rejects.toThrow("浏览器工作区数据已损坏");
  });

  it("reports browser quota failures without claiming a save", async () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new DOMException("full", "QuotaExceededError"); },
    } as unknown as Storage;
    await expect(saveWorkspace(workspace(), { storage, serverWorkspace: false })).rejects.toThrow("浏览器存储空间不足，工作区未保存");
  });
});
