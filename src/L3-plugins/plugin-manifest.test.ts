import { describe, expect, it } from "vitest";
import { parsePluginManifest } from "./plugin-manifest";

describe("plugin manifest", () => {
  it("accepts declared permissions", () => {
    expect(parsePluginManifest({ id: "demo.plugin", name: "示例插件", version: "1.0.0", developer: "Demo", description: "示例", permissions: ["network", "ai"] }).permissions).toEqual(["network", "ai"]);
  });
  it("rejects undeclared capabilities", () => {
    expect(() => parsePluginManifest({ id: "demo", name: "Demo", version: "1", developer: "D", description: "x", permissions: ["admin"] })).toThrow("未知插件权限");
  });
});
