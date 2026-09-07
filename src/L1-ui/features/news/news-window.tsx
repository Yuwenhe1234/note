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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const sortedItems = useMemo(() => state.items.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [state.items]);
  const selectedItem = sortedItems.find((item) => `${item.sourceId}-${item.id}` === selectedItemId);
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
    <header className="feature-window-header"><div><small>DAILY SIGNALS</small><h1>今日消息</h1><p>刷新订阅来源，让 AI 把新内容整理成重点。</p></div></header>
    <div className="news-layout">
      <div className="news-sidebar" data-testid="news-sidebar">
        <aside className="news-sources"><h2>订阅来源</h2><label><span>订阅链接</span><input aria-label="订阅链接" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="粘贴账号主页或网站链接" /></label><button className="news-add" onClick={add}><Plus />添加来源</button>
          <div className="news-source-list">{state.sources.map((source) => <article key={source.id}><div><strong>{source.name}</strong><span>{source.platform} · {source.loginStatus === "required" ? "需要重新登录" : "已订阅"}</span></div>{source.platform !== "website" && <button aria-label={`登录 ${source.name}`} onClick={async () => { try { await loginRequest(source.url); repo.updateSource(source.id, { loginStatus: "connected" }); setNotice("已打开 Edge 登录窗口，完成登录后再点击刷新"); reload(); } catch (error) { setNotice(error instanceof Error ? error.message : "登录窗口打开失败"); } }}><LogIn /></button>}<button aria-label={`删除 ${source.name}`} onClick={() => { repo.removeSource(source.id); reload(); }}><Trash2 /></button></article>)}</div>
        </aside>
        <button className="news-refresh" onClick={runRefresh} disabled={refreshing}><RefreshCw aria-hidden="true" />{refreshing ? "刷新中…" : "刷新"}</button>
      </div>
      <section className="news-feed" aria-live="polite">
        {notice && <div className="news-notice">{notice}</div>}
        {sortedItems.length === 0 ? <div className="news-empty"><h2>还没有新消息</h2><p>订阅后发布的新内容会显示在这里</p></div> : <>
          <div className="news-card-rail" data-testid="news-card-rail" aria-label="今日消息列表">
            <div className="news-card-grid">{sortedItems.map((item) => {
              const itemKey = `${item.sourceId}-${item.id}`;
              const active = selectedItemId === itemKey;
              return <button className={`news-card${active ? " is-active" : ""}`} key={itemKey} aria-label={`${item.sourceName}：${item.title}`} aria-expanded={active} onClick={() => setSelectedItemId(active ? null : itemKey)}>
                <strong>{item.sourceName}</strong><span>{item.title}</span>
              </button>;
            })}</div>
          </div>
          {selectedItem && <section className="news-detail" role="region" aria-label="消息详情">
            <div className="news-detail-heading"><small>UP 主</small><strong>{selectedItem.sourceName}</strong><small>视频标题</small><h2>{selectedItem.title}</h2></div>
            <div><h3>一句话总结</h3><p>{selectedItem.summary}</p></div>
            <div><h3>核心内容</h3><ol>{(selectedItem.coreContent?.length ? selectedItem.coreContent : [selectedItem.summary]).map((entry) => <li key={entry}>{entry}</li>)}</ol></div>
            <div><h3>重点信息</h3><ul>{selectedItem.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul></div>
            {selectedItem.whyItMatters && <div><h3>值得关注</h3><p>{selectedItem.whyItMatters}</p></div>}
            <div className="news-detail-meta"><h3>内容依据</h3><p>根据爬取到的视频简介、字幕或正文生成。未在原始内容中出现的信息不得补充或推测。</p><small>内容依据：{selectedItem.contentBasis || (selectedItem.platform === "website" ? "网页正文" : "视频简介")}</small><time dateTime={selectedItem.publishedAt}>发布时间：{new Date(selectedItem.publishedAt).toLocaleString("zh-CN")}</time></div>
            <a href={selectedItem.url} target="_blank" rel="noreferrer">查看原内容 <ExternalLink /></a>
          </section>}
        </>}
      </section>
    </div>
  </section>;
}
