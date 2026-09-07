export type NewsPlatform = "douyin" | "bilibili" | "xiaohongshu" | "youtube" | "website";

export type NewsSource = {
  id: string;
  url: string;
  name: string;
  platform: NewsPlatform;
  subscribedAt: string;
  lastSuccessfulRefreshAt?: string;
  cursor?: string;
  loginStatus: "unknown" | "connected" | "required";
};

export type NewsItem = {
  id: string;
  sourceId: string;
  platform: NewsPlatform;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  savedAt: string;
  thumbnailUrl?: string;
  summary: string;
  highlights: string[];
};

export type NewsRefreshSummary = { added: number; failed: number; loginRequired: number; errors: string[] };

export function detectNewsPlatform(value: string): NewsPlatform {
  const host = new URL(value).hostname.toLowerCase();
  if (host === "douyin.com" || host.endsWith(".douyin.com")) return "douyin";
  if (host === "bilibili.com" || host.endsWith(".bilibili.com")) return "bilibili";
  if (host === "xiaohongshu.com" || host.endsWith(".xiaohongshu.com")) return "xiaohongshu";
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
  return "website";
}

export function validateNewsSourceUrl(value: string): URL {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("订阅链接仅支持 HTTP 或 HTTPS");
  const platform = detectNewsPlatform(url.toString());
  if (platform === "website") return url;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const valid = platform === "bilibili"
    ? url.hostname.toLowerCase() === "space.bilibili.com" && /^\/\d+(?:\/video)?$/.test(path)
    : platform === "youtube"
      ? /^\/(?:@[^/]+|channel\/[^/]+|user\/[^/]+|c\/[^/]+)(?:\/videos)?$/.test(path)
      : platform === "douyin"
        ? /^\/user\/[^/]+$/.test(path)
        : /^\/user\/profile\/[^/]+$/.test(path);
  if (!valid) throw new Error("请输入平台的具体账号、频道或 UP 主主页链接，不能使用平台官网首页");
  return url;
}

export function normalizeContentUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  [...url.searchParams.keys()].filter((key) => key.startsWith("utm_") || ["spm_id_from", "share_source"].includes(key)).forEach((key) => url.searchParams.delete(key));
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  return url.toString().replace(/\/$/, url.pathname === "/" ? "/" : "");
}

export const isPublishedAfterSubscription = (publishedAt: string, subscribedAt: string) =>
  new Date(publishedAt).getTime() >= new Date(subscribedAt).getTime();

export const isExpiredNewsItem = (savedAt: string, now = new Date()) =>
  now.getTime() - new Date(savedAt).getTime() > 3 * 24 * 60 * 60 * 1000;
