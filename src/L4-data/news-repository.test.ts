import { beforeEach, describe, expect, it } from "vitest";
import { createNewsRepository } from "./news-repository";
import type { NewsItem } from "./news-model";

const item = (id: string, savedAt = "2026-09-05T00:00:00Z"): NewsItem => ({
  id, sourceId: "source-1", platform: "website", title: id,
  url: `https://example.com/${id}`, sourceName: "Example",
  publishedAt: savedAt, savedAt, summary: "摘要", highlights: ["重点"],
});

describe("news repository", () => {
  beforeEach(() => localStorage.clear());

  it("adds and removes sources without importing history", () => {
    const repo = createNewsRepository(localStorage, () => new Date("2026-09-05T10:00:00Z"));
    const source = repo.addSource("https://example.com/feed");
    expect(source.subscribedAt).toBe("2026-09-05T10:00:00.000Z");
    expect(repo.load().items).toEqual([]);
    repo.removeSource(source.id);
    expect(repo.load().sources).toEqual([]);
  });

  it("merges items and deduplicates by id and normalized link", () => {
    const repo = createNewsRepository(localStorage);
    expect(repo.mergeItems([item("a"), item("a"), { ...item("b"), url: "https://example.com/a?utm_source=x" }])).toBe(1);
    expect(repo.load().items).toHaveLength(1);
  });

  it("cleans expired messages but preserves sources and cursor", () => {
    const repo = createNewsRepository(localStorage, () => new Date("2026-09-05T00:00:00Z"));
    const source = repo.addSource("https://example.com/feed");
    repo.updateSource(source.id, { cursor: "next-1" });
    repo.mergeItems([item("old", "2026-09-01T23:59:59Z"), item("new", "2026-09-03T00:00:00Z")]);
    expect(repo.cleanup(new Date("2026-09-05T00:00:00Z"))).toBe(1);
    expect(repo.load().items.map((entry) => entry.id)).toEqual(["new"]);
    expect(repo.load().sources[0].cursor).toBe("next-1");
  });

  it("drops legacy platform-homepage subscriptions", () => {
    localStorage.setItem("memo-agent-news-v1", JSON.stringify({ version: 1, sources: [{ id: "bad", url: "https://www.douyin.com/", name: "douyin", platform: "douyin", subscribedAt: "2026-09-05T00:00:00Z", loginStatus: "unknown" }], items: [], fingerprints: [] }));
    expect(createNewsRepository(localStorage).load().sources).toEqual([]);
  });
});
