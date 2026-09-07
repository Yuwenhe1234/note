import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PluginCenterWindow } from "./plugin-center-window";

describe("PluginCenterWindow", () => {
  it("shows permissions and toggles a registered plugin", () => {
    render(<PluginCenterWindow manifests={[{ id: "demo.plugin", name: "示例插件", version: "1.0.0", developer: "Demo", description: "测试扩展", permissions: ["network"] }]} />);
    expect(screen.getByText("网络访问")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "启用 示例插件" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "停用 示例插件" })).toBeInTheDocument();
  });
});
