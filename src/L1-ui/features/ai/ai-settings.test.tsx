import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiSettings } from "./ai-settings";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("AI settings", () => {
  it("stores a visitor-owned API key without calling local server routes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AiSettings serverAi={false} />);
    expect(screen.getByText(/仅保存在当前浏览器/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "visitor-key" } });
    fireEvent.click(screen.getByRole("button", { name: "保存并设为当前" }));
    expect(await screen.findByText(/配置已保存/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("memo-agent-ai-config-v1") || "{}").apiKey).toBe("visitor-key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("switches the active provider from a provider card", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      json: async () => ({
        ok: true,
        data: {
          provider: init?.method === "PUT" ? "deepseek" : "openai",
          baseUrl:
            init?.method === "PUT"
              ? "https://api.deepseek.com"
              : "https://api.openai.com/v1",
          model: init?.method === "PUT" ? "deepseek-chat" : "gpt-4.1-mini",
          enabled: init?.method === "PUT",
          hasApiKey: false,
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiSettings />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.click(screen.getByRole("button", { name: "DeepSeek" }));
    expect(screen.getByText("当前服务商：OpenAI")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存并设为当前" }));
    expect(await screen.findByText("当前服务商：DeepSeek")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/config",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("adds and removes a custom AI API profile", async () => {
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
    render(<AiSettings />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByLabelText("自定义名称")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "自定义兼容接口" }));
    expect(
      screen.getByRole("heading", { name: "添加自定义 API" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("自定义名称"), {
      target: { value: "我的模型" },
    });
    fireEvent.change(screen.getByLabelText("自定义 Base URL"), {
      target: { value: "https://example.com/v1" },
    });
    fireEvent.change(screen.getByLabelText("自定义模型"), {
      target: { value: "example-chat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加 API" }));
    expect(
      await screen.findByRole("button", { name: "我的模型" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除当前 API" }));
    expect(
      screen.queryByRole("button", { name: "我的模型" }),
    ).not.toBeInTheDocument();
  });
});
