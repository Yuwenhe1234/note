import { describe, expect, it } from "vitest";
import { refreshNewsSources } from "./news-service";

const source = (id: string, url = `https://example.com/${id}`) => ({ id, url, platform: "website" as const, name: id, subscribedAt: "2026-09-05T10:00:00Z" });

describe("news refresh service", () => {
  it("returns only the latest item on the first refresh", async () => {
    const result = await refreshNewsSources({
      sources: [source("first")], knownKeys: [],
      collect: async () => [
        { id: "older", url: "https://example.com/older", title: "older", sourceName: "first", platform: "website", publishedAt: "2026-08-01T00:00:00Z", text: "old" },
        { id: "latest", url: "https://example.com/latest", title: "latest", sourceName: "first", platform: "website", publishedAt: "2026-08-02T00:00:00Z", text: "new" },
      ],
      summarize: async () => ({ summary: "总结", highlights: ["重点"] }),
      now: () => new Date("2026-09-05T12:00:00Z"),
    });
    expect(result.items.map((item) => item.id)).toEqual(["latest"]);
  });

  it("returns every item newer than the previous successful refresh", async () => {
    const result = await refreshNewsSources({
      sources: [{ ...source("again"), cursor: "2026-09-05T10:00:00Z" }], knownKeys: [],
      collect: async () => [
        { id: "old", url: "https://example.com/old", title: "old", sourceName: "again", platform: "website", publishedAt: "2026-09-05T09:00:00Z", text: "old" },
        { id: "new-1", url: "https://example.com/new-1", title: "new-1", sourceName: "again", platform: "website", publishedAt: "2026-09-05T10:01:00Z", text: "new" },
        { id: "new-2", url: "https://example.com/new-2", title: "new-2", sourceName: "again", platform: "website", publishedAt: "2026-09-05T10:02:00Z", text: "new" },
      ],
      summarize: async () => ({ summary: "总结", highlights: ["重点"] }),
      now: () => new Date("2026-09-05T12:00:00Z"),
    });
    expect(result.items.map((item) => item.id)).toEqual(["new-2"]);
  });

  it("recovers an unknown newest dynamic post when a failed collector already advanced the cursor", async () => {
    const result = await refreshNewsSources({
      sources: [{ ...source("self", "https://www.douyin.com/user/self"), platform: "douyin", cursor: "2026-09-07T10:00:00Z" }],
      knownKeys: [],
      collect: async () => [
        { id: "latest-real-post", url: "https://www.douyin.com/video/latest-real-post", title: "latest", sourceName: "self", platform: "douyin", publishedAt: "2026-09-07T09:18:58Z", text: "new" },
        { id: "history", url: "https://www.douyin.com/video/history", title: "history", sourceName: "self", platform: "douyin", publishedAt: "2026-09-01T09:00:00Z", text: "old" },
      ],
      summarize: async () => ({ summary: "总结", highlights: ["重点"] }),
      now: () => new Date("2026-09-07T10:30:00Z"),
    });

    expect(result.items.map((item) => item.id)).toEqual(["latest-real-post"]);
  });

  it("does not import dynamic history when the newest post is already known", async () => {
    const result = await refreshNewsSources({
      sources: [{ ...source("self", "https://www.douyin.com/user/self"), platform: "douyin", cursor: "2026-09-07T10:00:00Z" }],
      knownKeys: ["latest-real-post"],
      collect: async () => [
        { id: "latest-real-post", url: "https://www.douyin.com/video/latest-real-post", title: "latest", sourceName: "self", platform: "douyin", publishedAt: "2026-09-07T09:18:58Z", text: "new" },
        { id: "history", url: "https://www.douyin.com/video/history", title: "history", sourceName: "self", platform: "douyin", publishedAt: "2026-09-01T09:00:00Z", text: "old" },
      ],
      summarize: async () => ({ summary: "总结", highlights: ["重点"] }),
      now: () => new Date("2026-09-07T10:30:00Z"),
    });

    expect(result.items).toEqual([]);
  });

  it("filters old and duplicate content and returns complete summaries", async () => {
    const result = await refreshNewsSources({
      sources: [source("one")], knownKeys: ["old-id"],
      collect: async () => [
        { id: "before", url: "https://example.com/before", title: "before", sourceName: "one", platform: "website", publishedAt: "2026-09-05T09:00:00Z", text: "x" },
        { id: "old-id", url: "https://example.com/old", title: "old", sourceName: "one", platform: "website", publishedAt: "2026-09-05T11:00:00Z", text: "x" },
        { id: "new-id", url: "https://example.com/new", title: "new", sourceName: "one", platform: "website", publishedAt: "2026-09-05T11:00:00Z", text: "正文" },
      ],
      summarize: async () => ({ summary: "总结", highlights: ["重点一"] }),
      now: () => new Date("2026-09-05T12:00:00Z"),
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: "new-id", summary: "总结", highlights: ["重点一"] });
    expect(result.sources[0].cursor).toBe("2026-09-05T12:00:00.000Z");
  });

  it("preserves the structured AI summary used by the detail panel", async () => {
    const result = await refreshNewsSources({
      sources: [source("structured")], knownKeys: [],
      collect: async () => [{ id: "video-1", url: "https://example.com/video-1", title: "AI Agent 的最新进展", sourceName: "科技观察站", platform: "website", publishedAt: "2026-09-05T11:00:00Z", text: "正文" }],
      summarize: async () => ({
        summary: "一句话总结",
        coreContent: ["核心一", "核心二"],
        highlights: ["重点一"],
        whyItMatters: "值得关注的原因",
        contentBasis: "网页正文" as const,
      }),
      now: () => new Date("2026-09-05T12:00:00Z"),
    });

    expect(result.items[0]).toMatchObject({
      summary: "一句话总结",
      coreContent: ["核心一", "核心二"],
      highlights: ["重点一"],
      whyItMatters: "值得关注的原因",
      contentBasis: "网页正文",
    });
  });

  it("isolates source failures and does not advance failed cursor", async () => {
    const result = await refreshNewsSources({
      sources: [source("bad"), source("good")], knownKeys: [],
      collect: async (entry) => { if (entry.id === "bad") throw new Error("登录失效"); return []; },
      summarize: async () => ({ summary: "", highlights: [] }),
      now: () => new Date("2026-09-05T12:00:00Z"),
    });
    expect(result.errors).toEqual([{ sourceId: "bad", message: "登录失效" }]);
    expect(result.sources.find((entry) => entry.id === "bad")?.cursor).toBeUndefined();
    expect(result.sources.find((entry) => entry.id === "good")?.cursor).toBe("2026-09-05T12:00:00.000Z");
  });
});
