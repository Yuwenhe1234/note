import type { NewsItem, NewsSource } from "../../../L4-data/news-model";

export type NewsRefreshResponse = { items: NewsItem[]; sources: NewsSource[]; errors: { sourceId: string; message: string }[] };
export async function refreshNews(sources: NewsSource[], knownKeys: string[]): Promise<NewsRefreshResponse> {
  const response = await fetch("/api/news/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sources, knownKeys }) });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "刷新失败");
  return payload.data;
}

export async function openNewsLogin(url: string): Promise<void> {
  const response = await fetch("/api/news/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "登录窗口打开失败");
}
