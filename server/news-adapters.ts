import { isIP } from "node:net";
import type { CollectedContent, ServerNewsPlatform } from "./news-types.js";

const privateIp = /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i;
export function validateRemoteUrl(value: string): URL {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("仅支持 HTTP 或 HTTPS 地址");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || (isIP(host) && privateIp.test(host))) throw new Error("不允许访问本地网络地址");
  return url;
}

export function platformForUrl(value: string): ServerNewsPlatform {
  const host = validateRemoteUrl(value).hostname.toLowerCase();
  if (host === "douyin.com" || host.endsWith(".douyin.com")) return "douyin";
  if (host === "bilibili.com" || host.endsWith(".bilibili.com")) return "bilibili";
  if (host === "xiaohongshu.com" || host.endsWith(".xiaohongshu.com")) return "xiaohongshu";
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
  return "website";
}

export function validatePlatformSourceUrl(value: string): URL {
  const url = validateRemoteUrl(value);
  const platform = platformForUrl(value);
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

const decode = (value = "") => value.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const meta = (html: string, key: string) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*>`, "i"),
  ];
  return decode(patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean));
};
const jsonLd = (html: string) => {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const parsed = JSON.parse(match[1]); const values = Array.isArray(parsed) ? parsed : [parsed]; const article = values.find((value) => /Article|VideoObject/i.test(String(value?.["@type"]))); if (article) return article; } catch { /* ignore malformed page data */ }
  }
  return {} as Record<string, unknown>;
};

const douyinPublishedAt = (id: string) => {
  try {
    const seconds = Number(BigInt(id) >> 32n);
    if (seconds > 946684800 && seconds < 4102444800) return new Date(seconds * 1000).toISOString();
  } catch { /* fall through to unknown date */ }
  return "1970-01-01T00:00:00.000Z";
};

function extractDouyinProfileItems(source: { url: string; name: string }, html: string): CollectedContent[] {
  const items: CollectedContent[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']*\/video\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(match[1].replace(/&amp;/g, "&"), "https://www.douyin.com");
      if (/^Baiduspider/i.test(url.searchParams.get("source") || "")) continue;
      const id = match[2];
      const title = decode(match[3]);
      if (!title || items.some((item) => item.id === id)) continue;
      url.search = "";
      items.push({ id, url: url.toString(), title, sourceName: source.name, platform: "douyin", publishedAt: douyinPublishedAt(id), text: title });
      if (items.length >= 20) break;
    } catch { /* skip malformed profile entries */ }
  }
  return items;
}

const canonicalUrl = (html: string) => {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return match?.[1].replace(/&amp;/g, "&");
};

function extractCapturedDouyinItems(source: { url: string; name: string }, html: string): CollectedContent[] {
  const items: CollectedContent[] = [];
  for (const match of html.matchAll(/<script[^>]*data-memo-douyin-posts[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const payload = JSON.parse(match[1]);
      for (const entry of Array.isArray(payload?.aweme_list) ? payload.aweme_list : []) {
        const id = String(entry?.aweme_id || "");
        if (!/^\d{10,}$/.test(id) || items.some((item) => item.id === id)) continue;
        const rawTitle = String(entry?.desc || entry?.item_title || entry?.preview_title || entry?.caption || "");
        const title = decode(rawTitle) || "无文字标题的抖音作品";
        const createdAt = Number(entry?.create_time);
        const publishedAt = Number.isFinite(createdAt) && createdAt > 0 ? new Date(createdAt * 1000).toISOString() : douyinPublishedAt(id);
        const thumbnailUrl = entry?.video?.cover?.url_list?.[0] || entry?.images?.[0]?.url_list?.[0] || undefined;
        items.push({ id, url: `https://www.douyin.com/video/${id}`, title, sourceName: String(entry?.author?.nickname || source.name), platform: "douyin", publishedAt, thumbnailUrl, text: decode(rawTitle) });
      }
    } catch { /* skip malformed captured API data */ }
  }
  const requestedId = new URL(source.url).searchParams.get("vid");
  const requested = requestedId ? items.find((item) => item.id === requestedId) : undefined;
  return requested ? [requested] : items.slice().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 1);
}

function extractCapturedBilibiliItems(source: { name: string }, html: string): CollectedContent[] {
  for (const match of html.matchAll(/<script[^>]*data-memo-bilibili-posts[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const list = JSON.parse(match[1])?.data?.list?.vlist;
      if (!Array.isArray(list) || !list.length) continue;
      const latest = list.slice().sort((a: any, b: any) => Number(b.created) - Number(a.created))[0];
      if (!latest?.bvid || !latest?.created) continue;
      const pageName = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/(?:的个人空间|个人主页|_哔哩哔哩).*$/i, "").trim();
      return [{ id: latest.bvid, url: `https://www.bilibili.com/video/${latest.bvid}`, title: decode(String(latest.title || "")), sourceName: decode(String(latest.author || pageName || "作者信息未获取")), platform: "bilibili", publishedAt: new Date(Number(latest.created) * 1000).toISOString(), thumbnailUrl: latest.pic, text: decode(String(latest.description || "")) }];
    } catch { /* ignore malformed Bilibili payload */ }
  }
  return [];
}

export function extractPageContent(url: string, html: string): CollectedContent {
  const data: any = jsonLd(html);
  const title = meta(html, "og:title") || decode(String(data.headline || data.name || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || new URL(url).hostname));
  const embeddedSeconds = html.match(/["'](?:pubdate|create_time)["']\s*:\s*(\d{10})/)?.[1];
  const embeddedDate = html.match(/["']publishDate["']\s*:\s*["']([^"']+)/)?.[1];
  const publishedAt = meta(html, "article:published_time") || meta(html, "datePublished") || String(data.datePublished || embeddedDate || (embeddedSeconds ? new Date(Number(embeddedSeconds) * 1000).toISOString() : "1970-01-01T00:00:00.000Z"));
  return { id: meta(html, "og:url") || url, url: meta(html, "og:url") || url, title, sourceName: decode(String(data.author?.name || meta(html, "og:site_name") || new URL(url).hostname)), platform: platformForUrl(url), publishedAt, thumbnailUrl: meta(html, "og:image") || String(data.thumbnailUrl || "") || undefined, text: decode(String(data.articleBody || data.description || meta(html, "description") || meta(html, "og:description") || "")) };
}

export function discoverContentUrls(sourceUrl: string, html: string): string[] {
  const platform = platformForUrl(sourceUrl);
  const source = new URL(sourceUrl);
  const patterns: Record<ServerNewsPlatform, RegExp> = {
    bilibili: /\/video\/BV[\w-]+/i,
    youtube: /\/(?:watch\?v=|shorts\/)[\w-]+/i,
    douyin: /\/video\/\d+/i,
    xiaohongshu: /\/(?:explore|discovery\/item)\/[\w-]+/i,
    website: /\/(?:article|articles|post|posts|news|blog)\//i,
  };
  const found: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi)) {
    try {
      const href = match[1].replace(/&amp;/g, "&");
      const base = platform === "bilibili" && href.startsWith("/") ? "https://www.bilibili.com" : source.origin;
      const url = new URL(href, base);
      if (platform === "website" && url.origin !== source.origin) continue;
      if (!patterns[platform].test(`${url.pathname}${url.search}`)) continue;
      validateRemoteUrl(url.toString());
      if (!found.includes(url.toString())) found.push(url.toString());
      if (found.length >= 20) break;
    } catch { /* skip malformed page links */ }
  }
  const embedded: Partial<Record<ServerNewsPlatform, { pattern: RegExp; make: (id: string) => string }>> = {
    bilibili: { pattern: /["']bvid["']\s*:\s*["'](BV[0-9A-Za-z]+)["']/gi, make: (id) => `https://www.bilibili.com/video/${id}` },
    youtube: { pattern: /["']videoId["']\s*:\s*["']([\w-]+)["']/gi, make: (id) => `https://www.youtube.com/watch?v=${id}` },
    douyin: { pattern: /["']aweme_id["']\s*:\s*["']?(\d{10,})["']?/gi, make: (id) => `https://www.douyin.com/video/${id}` },
    xiaohongshu: { pattern: /["'](?:noteId|note_id)["']\s*:\s*["']([0-9a-fA-F]{12,})["']/gi, make: (id) => `https://www.xiaohongshu.com/explore/${id}` },
  };
  const rule = embedded[platform];
  if (rule && found.length < 20) {
    for (const match of html.matchAll(rule.pattern)) {
      const url = rule.make(match[1]);
      if (!found.includes(url)) found.push(url);
      if (found.length >= 20) break;
    }
  }
  return found;
}

export async function collectSourcePage(source: { url: string; name: string }, fetcher: typeof fetch = fetch, render?: (url: string) => Promise<string>): Promise<CollectedContent[]> {
  validatePlatformSourceUrl(source.url);
  const platform = platformForUrl(source.url);
  let html: string;
  if (platform !== "website" && render) {
    html = await render(source.url);
  } else {
    const response = await fetcher(source.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MemoAgent/0.2)" }, redirect: "follow" });
    if (!response.ok) throw new Error(`来源访问失败 (${response.status})`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) throw new Error("来源不是可解析的网页");
    html = await response.text();
  }
  if (platform === "douyin") {
    let capturedItems = extractCapturedDouyinItems(source, html);
    if (capturedItems.length) return capturedItems;
    if (render && new URL(source.url).pathname.replace(/\/+$/, "") === "/user/self") {
      const publicProfile = canonicalUrl(html);
      if (publicProfile && publicProfile !== source.url) {
        validatePlatformSourceUrl(publicProfile);
        html = await render(publicProfile);
        capturedItems = extractCapturedDouyinItems(source, html);
        if (capturedItems.length) return capturedItems;
      }
    }
    throw new Error("抖音未返回本人作品，请确认登录状态后重试");
  }
  if (platform === "bilibili") {
    const capturedItems = extractCapturedBilibiliItems(source, html);
    if (capturedItems.length) return capturedItems;
  }
  const discovered = discoverContentUrls(source.url, html);
  if (!discovered.length) {
    if (platform !== "website") throw new Error("没有发现真实作品，请确认已登录且输入的是具体账号主页");
    return [{ ...extractPageContent(source.url, html), sourceName: source.name }];
  }
  const results = await Promise.allSettled(discovered.slice(0, 1).map(async (url) => {
    if (platform !== "website" && render) return { ...extractPageContent(url, await render(url)), sourceName: source.name };
    const page = await fetcher(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MemoAgent/0.2)" }, redirect: "follow" });
    if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) throw new Error(`内容访问失败 (${page.status})`);
    return { ...extractPageContent(url, await page.text()), sourceName: source.name };
  }));
  return results.filter((result): result is PromiseFulfilledResult<CollectedContent> => result.status === "fulfilled").map((result) => result.value);
}
