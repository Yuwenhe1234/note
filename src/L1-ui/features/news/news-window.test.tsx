import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("shows compact cards and toggles one structured detail panel", async () => {
    const refresh = vi.fn().mockResolvedValue({ items: [
      { id: "n1", sourceId: "s1", platform: "website", title: "新视频", url: "https://example.com/new", sourceName: "Example", publishedAt: "2026-09-05T12:00:00Z", savedAt: "2026-09-05T12:01:00Z", summary: "Agent 能够拆分复杂任务", coreContent: ["核心一", "核心二"], highlights: ["重点一", "重点二"], whyItMatters: "值得关注的原因", contentBasis: "网页正文" },
      { id: "n2", sourceId: "s1", platform: "website", title: "第二个视频", url: "https://example.com/second", sourceName: "Another", publishedAt: "2026-09-05T13:00:00Z", savedAt: "2026-09-05T13:01:00Z", summary: "第二条总结", highlights: ["第二条重点"] },
    ], sources: [], errors: [] });
    render(<NewsWindow refreshRequest={refresh} initialSourceUrl="https://example.com/feed" />);
    const sidebar = screen.getByTestId("news-sidebar");
    fireEvent.click(within(sidebar).getByRole("button", { name: "刷新" }));
    expect(screen.getByRole("button", { name: "刷新中…" })).toBeDisabled();
    const firstCard = await screen.findByRole("button", { name: "Example：新视频" });
    const secondCard = screen.getByRole("button", { name: "Another：第二个视频" });
    expect(screen.getByTestId("news-card-rail")).toHaveAttribute("aria-label", "今日消息列表");
    expect(firstCard.closest(".news-card-grid")).not.toBeNull();
    expect(screen.queryByText("Agent 能够拆分复杂任务")).not.toBeInTheDocument();

    fireEvent.click(firstCard);
    const detail = screen.getByRole("region", { name: "消息详情" });
    expect(detail).toHaveTextContent("Agent 能够拆分复杂任务");
    expect(detail).toHaveTextContent("核心内容");
    expect(detail).toHaveTextContent("值得关注的原因");
    expect(detail).toHaveTextContent("内容依据：网页正文");
    expect(within(detail).getByRole("link", { name: "查看原内容" })).toHaveAttribute("href", "https://example.com/new");
    expect(firstCard).toHaveClass("is-active");

    fireEvent.click(secondCard);
    expect(screen.getByRole("region", { name: "消息详情" })).toHaveTextContent("第二条总结");
    expect(screen.queryByText("Agent 能够拆分复杂任务")).not.toBeInTheDocument();

    fireEvent.click(secondCard);
    expect(screen.queryByRole("region", { name: "消息详情" })).not.toBeInTheDocument();
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
