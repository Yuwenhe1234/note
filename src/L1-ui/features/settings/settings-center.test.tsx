import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsCenter } from "./settings-center";
import { loadSettings } from "../../../L4-data/settings-repository";

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    json: async () => ({
      ok: true,
      data: {
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4.1-mini",
        enabled: false,
        hasApiKey: false,
      },
    }),
  }),
);

describe("settings center", () => {
  it.each([
    "任务默认值",
    "AI 与 API",
    "提醒方式",
    "外观与主题",
    "交互与快捷操作",
    "数据管理",
    "关于与诊断",
  ])("opens and returns from %s", (name) => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回设置" }));
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });
  it("persists task defaults", () => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "任务默认值" }));
    fireEvent.change(screen.getByLabelText("默认优先级"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByLabelText("默认预计时长"), {
      target: { value: "90" },
    });
    expect(loadSettings().taskDefaults.defaultPriority).toBe("high");
    expect(loadSettings().taskDefaults.defaultDurationMinutes).toBe(90);
  });
  it("applies interaction settings", () => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "交互与快捷操作" }));
    fireEvent.click(screen.getByLabelText("减少动态效果"));
    expect(document.documentElement).toHaveClass("reduce-motion");
  });
  it("shows diagnostics without API keys", async () => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "关于与诊断" }));
    expect(await screen.findByText(/本地 API/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("sk-secret");
  });
  it("reports why a test notification cannot be sent", () => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "提醒方式" }));
    fireEvent.click(screen.getByRole("button", { name: "发送测试通知" }));
    expect(screen.getByText("当前浏览器不支持通知")).toBeInTheDocument();
  });
});
