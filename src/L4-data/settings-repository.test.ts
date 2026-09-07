import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, resetSettings, saveSettings } from "./settings-repository";

afterEach(() => localStorage.clear());

describe("settings repository", () => {
  it("saves and restores versioned settings", () => {
    saveSettings({ ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_SETTINGS.appearance, accent: "blue" } });
    expect(loadSettings().appearance.accent).toBe("blue");
  });
  it("merges partial settings and falls back from malformed JSON", () => {
    localStorage.setItem("memo-agent-settings-v1", JSON.stringify({ appearance: { accent: "orange" } }));
    expect(loadSettings().appearance.accent).toBe("orange");
    expect(loadSettings().taskDefaults.defaultDurationMinutes).toBe(60);
    localStorage.setItem("memo-agent-settings-v1", "broken");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it("resets settings", () => {
    saveSettings({ ...DEFAULT_SETTINGS, interaction: { ...DEFAULT_SETTINGS.interaction, animations: false } });
    expect(resetSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
