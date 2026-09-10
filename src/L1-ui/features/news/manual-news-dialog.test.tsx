import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ManualNewsDialog } from "./manual-news-dialog";

const source = { id: "s1", url: "https://example.com/feed", name: "Example", platform: "website" as const, subscribedAt: "2026-09-10T00:00:00Z", loginStatus: "unknown" as const };

it("submits a manual message with optional AI summarization", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<ManualNewsDialog sources={[source]} onClose={() => {}} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText("内容链接"), { target: { value: "https://example.com/post" } });
  fireEvent.change(screen.getByLabelText("消息标题"), { target: { value: "新消息" } });
  fireEvent.change(screen.getByLabelText("消息正文"), { target: { value: "正文内容" } });
  fireEvent.click(screen.getByLabelText("使用 AI 生成摘要"));
  fireEvent.click(screen.getByRole("button", { name: "保存消息" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ sourceId: "s1", url: "https://example.com/post", title: "新消息", body: "正文内容" }, true));
});
