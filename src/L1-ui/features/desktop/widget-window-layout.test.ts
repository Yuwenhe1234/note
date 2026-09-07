import { describe, expect, it } from "vitest";
import { DEFAULT_WIDGET_SETTINGS } from "./widget-model";
import { calculateWidgetWindowHeight } from "./widget-window-layout";

describe("calculateWidgetWindowHeight", () => {
  it("uses the compact minimum when both sections are hidden", () => {
    expect(calculateWidgetWindowHeight(
      { ...DEFAULT_WIDGET_SETTINGS, todayEnabled: false, tasksEnabled: false },
      0,
      0,
    )).toBe(220);
  });

  it("grows with visible today and task items", () => {
    const short = calculateWidgetWindowHeight(DEFAULT_WIDGET_SETTINGS, 1, 1);
    const long = calculateWidgetWindowHeight(DEFAULT_WIDGET_SETTINGS, 5, 5);
    expect(long).toBeGreaterThan(short);
  });

  it("respects configured limits and the maximum window height", () => {
    const limited = calculateWidgetWindowHeight(
      { ...DEFAULT_WIDGET_SETTINGS, todayLimit: 2, tasksLimit: 2 },
      20,
      20,
    );
    expect(limited).toBe(calculateWidgetWindowHeight(
      { ...DEFAULT_WIDGET_SETTINGS, todayLimit: 2, tasksLimit: 2 },
      2,
      2,
    ));
    expect(limited).toBeLessThanOrEqual(720);
  });
});
