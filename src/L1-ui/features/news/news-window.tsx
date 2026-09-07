import { useMemo, useState } from "react";
import { ExternalLink, LogIn, Plus, RefreshCw, Trash2 } from "lucide-react";
import { createNewsRepository } from "../../../L4-data/news-repository";
import type { NewsSource } from "../../../L4-data/news-model";
import { openNewsLogin, refreshNews, type NewsRefreshResponse } from "./news-client";

export function NewsWindow({ refreshRequest = refreshNews, loginRequest = openNewsLogin, initialSourceUrl }: { refreshRequest?: (sources: NewsSource[], knownKeys: string[]) => Promise<NewsRefreshResponse>; loginRequest?: (url: string) => Promise<void>; initialSourceUrl?: string }) {
  const repo = useMemo(() => createNewsRepository(localStorage), []);
  const [state, setState] = useState(() => { repo.cleanup(); if (initialSourceUrl) repo.addSource(initialSourceUrl); return repo.load(); });
  const [url, setUrl] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const reload = () => setState(repo.load());
  const add = () => { try { if (!url.trim()) return; repo.addSource(url.trim()); setUrl(""); setNotice(""); reload(); } catch (error) { setNotice(error instanceof Error ? error.message : "请输入有效的 HTTP 或 HTTPS 链接"); } };
  const runRefresh = async () => {
    if (!state.sources.length) return setNotice("请先添加订阅来源");
    setRefreshing(true); setNotice("");
    try {
      const result = await refreshRequest(state.sources, state.items.flatMap((item) => [item.id, item.url]));
      const added = repo.mergeItems(result.items);
      result.sources.forEach((source) => repo.updateSource(source.id, { cursor: source.cursor, lastSuccessfulRefreshAt: source.lastSuccessfulRefreshAt || source.cursor }));
      result.errors.forEach((error) => repo.updateSource(error.sourceId, { loginStatus: /登录/.test(error.message) ? "required" : "unknown" }));
      setNotice(result.errors.length ? `新增 ${added} 条，${result.errors.length} 个来源刷新失败` : added ? `新增 ${added} 条消息` : "暂无新消息");
      reload();
    } catch (error) { setNotice(error instanceof Error ? error.message : "刷新失败"); }
    finally { setRefreshing(false); }
  };
  return <section className="feature-window news-window">
    <header className="feature-window-header"><div><small>DAILY SIGNALS</small><h1>今日消息</h1><p>刷新订阅来源，让 AI 把新内容整理成重点。</p></div><button className="primary" onClick={runRefresh} disabled={refreshing}>{<RefreshCw aria-hidden="true" />}{refreshing ? "刷新中…" : "刷新"}</button></header>
    <div className="news-layout">
      <aside className="news-sources"><h2>订阅来源</h2><label><span>订阅链接</span><input aria-label="订阅链接" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="粘贴账号主页或网站链接" /></label><button className="news-add" onClick={add}><Plus />添加来源</button>
        <div className="news-source-list">{state.sources.map((source) => <article key={source.id}><div><strong>{source.name}</strong><span>{source.platform} · {source.loginStatus === "required" ? "需要重新登录" : "已订阅"}</span></div>{source.platform !== "website" && <button aria-label={`登录 ${source.name}`} onClick={async () => { try { await loginRequest(source.url); repo.updateSource(source.id, { loginStatus: "connected" }); setNotice("已打开 Edge 登录窗口，完成登录后再点击刷新"); reload(); } catch (error) { setNotice(error instanceof Error ? error.message : "登录窗口打开失败"); } }}><LogIn /></button>}<button aria-label={`删除 ${source.name}`} onClick={() => { repo.removeSource(source.id); reload(); }}><Trash2 /></button></article>)}</div>
      </aside>
      <section className="news-feed" aria-live="polite">{notice && <div className="news-notice">{notice}</div>}{state.items.length === 0 ? <div className="news-empty"><h2>还没有新消息</h2><p>订阅后发布的新内容会显示在这里</p></div> : state.items.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).map((item) => <article className="news-card" key={`${item.sourceId}-${item.id}`}>{item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" />}<div><small>{item.sourceName} · {new Date(item.publishedAt).toLocaleString("zh-CN")}</small><h2>{item.title}</h2><p>{item.summary}</p><ul>{item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul><a href={item.url} target="_blank" rel="noreferrer">查看原内容 <ExternalLink /></a></div></article>)}</section>
    </div>
  </section>;
}
