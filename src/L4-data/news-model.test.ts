import { describe, expect, it } from "vitest";
import {
  detectNewsPlatform,
  isExpiredNewsItem,
  isPublishedAfterSubscription,
  normalizeContentUrl,
  validateNewsSourceUrl,
} from "./news-model";

describe("news model", () => {
  it.each([
    ["https://www.douyin.com/user/a", "douyin"],
    ["https://space.bilibili.com/1", "bilibili"],
    ["https://www.xiaohongshu.com/user/profile/a", "xiaohongshu"],
    ["https://www.youtube.com/@openai", "youtube"],
    ["https://example.com/feed", "website"],
  ] as const)("detects %s", (url, platform) => {
    expect(detectNewsPlatform(url)).toBe(platform);
  });

  it("normalizes links for duplicate detection", () => {
    expect(normalizeContentUrl("https://EXAMPLE.com/a/?utm_source=x&b=2#top"))
      .toBe("https://example.com/a?b=2");
  });

  it("only accepts content published after subscribing", () => {
    expect(isPublishedAfterSubscription("2026-09-05T10:00:01Z", "2026-09-05T10:00:00Z")).toBe(true);
    expect(isPublishedAfterSubscription("2026-09-05T09:59:59Z", "2026-09-05T10:00:00Z")).toBe(false);
  });

  it("expires messages after three days", () => {
    expect(isExpiredNewsItem("2026-09-01T00:00:00Z", new Date("2026-09-04T00:00:01Z"))).toBe(true);
    expect(isExpiredNewsItem("2026-09-02T00:00:00Z", new Date("2026-09-04T00:00:00Z"))).toBe(false);
  });

  it.each([
    "https://www.douyin.com/",
    "https://www.bilibili.com/",
    "https://www.youtube.com/",
    "https://www.xiaohongshu.com/",
  ])("rejects a platform homepage without an account: %s", (url) => {
    expect(() => validateNewsSourceUrl(url)).toThrow("具体账号");
  });

  it.each([
    "https://space.bilibili.com/123/video",
    "https://www.youtube.com/@openai/videos",
    "https://www.douyin.com/user/MS4wLjABAAAA",
    "https://www.xiaohongshu.com/user/profile/abc",
    "https://example.com/blog",
  ])("accepts a concrete source: %s", (url) => {
    expect(validateNewsSourceUrl(url)).toBeTruthy();
  });
});
