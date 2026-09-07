import { describe, expect, it } from "vitest";
import { DEFAULT_WIDGET_SETTINGS, normalizeWidgetSettings } from "./widget-model";

describe("normalizeWidgetSettings", () => {
  it("returns defaults for undefined input", () => {
    expect(normalizeWidgetSettings(undefined)).toEqual(DEFAULT_WIDGET_SETTINGS);
    expect(DEFAULT_WIDGET_SETTINGS.theme).toBe("system");
  });

  it("migrates missing or invalid themes to system", () => {
    expect(normalizeWidgetSettings({}).theme).toBe("system");
    expect(normalizeWidgetSettings({ theme: "neon" as never }).theme).toBe("system");
    expect(normalizeWidgetSettings({ theme: "light" }).theme).toBe("light");
  });

  it("merges provided values over defaults", () => {
    const result = normalizeWidgetSettings({ opacity: 70, todayLimit: 3 });
    expect(result.opacity).toBe(70);
    expect(result.todayLimit).toBe(3);
    expect(result.tasksEnabled).toBe(true);
  });

  it("clamps opacity to 60–100", () => {
    expect(normalizeWidgetSettings({ opacity: 10 }).opacity).toBe(60);
    expect(normalizeWidgetSettings({ opacity: 200 }).opacity).toBe(100);
  });

  it("clamps limits to 1–20 and rounds", () => {
    expect(normalizeWidgetSettings({ todayLimit: 0 }).todayLimit).toBe(1);
    expect(normalizeWidgetSettings({ tasksLimit: 99 }).tasksLimit).toBe(20);
    expect(normalizeWidgetSettings({ todayLimit: 3.6 }).todayLimit).toBe(4);
  });

  it("treats non-boolean flags as defaults", () => {
    expect(normalizeWidgetSettings({ todayEnabled: "yes" as never }).todayEnabled).toBe(true);
    expect(normalizeWidgetSettings({ tasksEnabled: 0 as never }).tasksEnabled).toBe(true);
  });
});
