import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsCenter } from "./settings-center";
import { loadSettings } from "../../../L4-data/settings-repository";
import "../../../index.css";

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
  it("requires enabling reminders before a test notification can be sent", () => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "提醒方式" }));
    expect(screen.getByRole("button", { name: "发送测试通知" })).toBeDisabled();
    expect(screen.getByText("请先开启待办提醒后再发送测试通知")).toBeInTheDocument();
  });
  it("offers only persistent theme and accent appearance controls", () => {
    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "外观与主题" }));
    expect(screen.getByLabelText("主题")).toBeInTheDocument();
    expect(screen.getByLabelText("强调色")).toBeInTheDocument();
    expect(screen.queryByLabelText("字体大小")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("界面密度")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("主题"), { target: { value: "light" } });
    fireEvent.change(screen.getByLabelText("强调色"), { target: { value: "blue" } });
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.accent).toBe("blue");
    expect(loadSettings().appearance.theme).toBe("light");
    const themeStyles = getComputedStyle(document.documentElement);
    expect(themeStyles.getPropertyValue("--page-bg").trim()).toBe("#eef1f0");
    expect(themeStyles.getPropertyValue("--surface-1").trim()).toBe("#ffffff");
    expect(themeStyles.getPropertyValue("--surface-2").trim()).toBe("#f5f7f6");
  });

  it("keeps only working browser notification controls and sends a test notification", async () => {
    let permission: NotificationPermission = "default";
    const requestPermission = vi.fn(async () => (permission = "granted"));
    const notification = vi.fn();
    Object.defineProperty(notification, "permission", { get: () => permission });
    Object.defineProperty(notification, "requestPermission", { value: requestPermission });
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: notification });

    render(<SettingsCenter />);
    fireEvent.click(screen.getByRole("button", { name: "提醒方式" }));
    expect(screen.queryByLabelText("默认提前分钟")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("逾期提醒")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("待办提醒"));
    await waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
    await waitFor(() => expect(loadSettings().reminders.notifications).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "发送测试通知" }));
    await waitFor(() => expect(notification).toHaveBeenCalledWith("任务提醒测试", expect.anything()));
  });
});
