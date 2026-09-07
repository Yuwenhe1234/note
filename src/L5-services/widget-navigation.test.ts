import { describe, expect, it } from "vitest";
import { buildAddTodayPath, buildTaskPath } from "./widget-navigation";

describe("widget website navigation", () => {
  it("builds the add-today website path", () => {
    expect(buildAddTodayPath()).toBe("/?widgetAction=add-today");
  });

  it("encodes task ids in website paths", () => {
    expect(buildTaskPath("task / 中文")).toBe(
      "/?widgetTask=task%20%2F%20%E4%B8%AD%E6%96%87",
    );
  });
});
