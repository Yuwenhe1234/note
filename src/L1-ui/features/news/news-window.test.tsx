import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsWindow } from "./news-window";

describe("NewsWindow", () => {
  it("adds a source without importing history", () => {
    render(<NewsWindow />);
    fireEvent.change(screen.getByLabelText("订阅链接"), { target: { value: "https://example.com/feed" } });
    fireEvent.click(screen.getByRole("button", { name: "添加来源" }));
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("订阅后发布的新内容会显示在这里")).toBeInTheDocument();
  });

  it("rejects a platform homepage without creating a fake source", () => {
    render(<NewsWindow />);
    fireEvent.change(screen.getByLabelText("订阅链接"), { target: { value: "https://www.douyin.com/" } });
    fireEvent.click(screen.getByRole("button", { name: "添加来源" }));
    expect(screen.getByText(/具体账号/)).toBeInTheDocument();
    expect(screen.queryByText("www.douyin.com")).not.toBeInTheDocument();
  });

  it("shows complete cards after refresh", async () => {
    const refresh = vi.fn().mockResolvedValue({ items: [{ id: "n1", sourceId: "s1", platform: "website", title: "新文章", url: "https://example.com/new", sourceName: "Example", publishedAt: "2026-09-05T12:00:00Z", savedAt: "2026-09-05T12:01:00Z", summary: "文章摘要", highlights: ["重点一", "重点二"] }], sources: [], errors: [] });
    render(<NewsWindow refreshRequest={refresh} initialSourceUrl="https://example.com/feed" />);
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(screen.getByRole("button", { name: "刷新中…" })).toBeDisabled();
    await waitFor(() => expect(screen.getByText("文章摘要")).toBeInTheDocument());
    expect(screen.getByText("重点一")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看原内容" })).toHaveAttribute("href", "https://example.com/new");
  });

  it("keeps successful sources visible when another source fails", async () => {
    const refresh = vi.fn().mockResolvedValue({ items: [], sources: [], errors: [{ sourceId: "missing", message: "登录失效" }] });
    render(<NewsWindow refreshRequest={refresh} initialSourceUrl="https://example.com/feed" />);
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText(/1 个来源刷新失败/)).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("opens platform login through the persistent local browser service", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    render(<NewsWindow loginRequest={login} initialSourceUrl="https://space.bilibili.com/123/video" />);
    fireEvent.click(screen.getByRole("button", { name: "登录 space.bilibili.com" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("https://space.bilibili.com/123/video"));
    expect(screen.getByText("已打开 Edge 登录窗口，完成登录后再点击刷新")).toBeInTheDocument();
  });
});
