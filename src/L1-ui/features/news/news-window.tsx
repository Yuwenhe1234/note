import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { createNewsRepository } from "../../../L4-data/news-repository";
import type { NewsSource } from "../../../L4-data/news-model";
import { openNewsLogin, refreshNews, type NewsRefreshResponse } from "./news-client";

export function NewsWindow({ refreshRequest = refreshNews, loginRequest = openNewsLogin, initialSourceUrl }: { refreshRequest?: (sources: NewsSource[], knownKeys: string[]) => Promise<NewsRefreshResponse>; loginRequest?: (url: string) => Promise<void>; initialSourceUrl?: string }) {
  const repo = useMemo(() => createNewsRepository(localStorage), []);
  const [state, setState] = useState(() => { repo.cleanup(); if (initialSourceUrl) repo.addSource(initialSourceUrl); return repo.load(); });
  const [url, setUrl] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(() => localStorage.getItem("memo-agent-news-last-notice") || "");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", profileDescription: "", tags: "" });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(() => repo.getSchedule());
  const [scheduleError, setScheduleError] = useState("");
  const triggerCardRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortedItems = useMemo(() => state.items.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [state.items]);
  const selectedItem = sortedItems.find((item) => `${item.sourceId}-${item.id}` === selectedItemId);
  const creatorName = (name: string) => /^(?:www\.|space\.)?[\w.-]+\.(?:com|cn|net|org)$/i.test(name) ? "作者信息未获取" : name;
  const closeDetail = () => { setSelectedItemId(null); triggerCardRef.current?.focus(); };
  useEffect(() => {
    if (!selectedItemId) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeDetail(); };
    document.body.classList.add("news-modal-open");
    document.addEventListener("keydown", closeOnEscape);
    closeButtonRef.current?.focus();
    return () => { document.body.classList.remove("news-modal-open"); document.removeEventListener("keydown", closeOnEscape); };
  }, [selectedItemId]);
  const reload = () => setState(repo.load());
  const setRefreshNotice = (value: string) => { setNotice(value); localStorage.setItem("memo-agent-news-last-notice", value); };
  const add = () => { try { if (!url.trim()) return; repo.addSource(url.trim()); setUrl(""); reload(); } catch (error) { setRefreshNotice(error instanceof Error ? error.message : "请输入有效的 HTTP 或 HTTPS 链接"); } };
  const runRefresh = async () => {
    if (!state.sources.length) return setRefreshNotice("请先添加订阅来源");
    setRefreshing(true);
    try {
      const result = await refreshRequest(state.sources, state.items.flatMap((item) => [item.id, item.url]));
      const added = repo.replaceLatestItems(result.items);
      result.items.forEach((item) => repo.applyExtractedProfile(item.sourceId, { displayName: creatorName(item.sourceName) === "作者信息未获取" ? undefined : item.sourceName }));
      result.sources.forEach((source) => repo.updateSource(source.id, { cursor: source.cursor, lastSuccessfulRefreshAt: source.lastSuccessfulRefreshAt || source.cursor }));
      result.errors.forEach((error) => repo.updateSource(error.sourceId, { loginStatus: /登录/.test(error.message) ? "required" : "unknown" }));
      repo.removeItemsForSources(result.errors.map((error) => error.sourceId));
      setRefreshNotice(result.errors.length ? `已更新 ${added} 个来源，${result.errors.length} 个来源刷新失败` : added ? `已更新 ${added} 个来源` : "暂无可验证的新内容");
      reload();
    } catch (error) { setRefreshNotice(error instanceof Error ? error.message : "刷新失败"); }
    finally { setRefreshing(false); }
  };
  return <section className="feature-window news-window">
    <header className="feature-window-header"><div><small>DAILY SIGNALS</small><h1>今日消息</h1><p>刷新订阅来源，让 AI 把新内容整理成重点。</p></div></header>
    <div className="news-layout">
      <div className="news-sidebar" data-testid="news-sidebar">
        <aside className="news-sources"><h2>订阅来源</h2><label><span>订阅链接</span><input aria-label="订阅链接" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="粘贴账号主页或网站链接" /></label><button className="news-add" onClick={add}><Plus />添加来源</button>
          <div className="news-source-list news-source-scroll" role="list" aria-label="订阅来源列表">{state.sources.slice().sort((a, b) => b.subscribedAt.localeCompare(a.subscribedAt)).map((source) => <article className="news-source-card" role="listitem" key={source.id}><div><div className="news-source-heading"><strong>{source.displayName || "待补充资料"}</strong><time dateTime={source.subscribedAt}>{new Date(source.subscribedAt).toLocaleDateString("zh-CN")}</time></div>{source.tags?.length ? <em>{source.tags.map((tag) => <span key={tag}>{tag}</span>)}</em> : null}<small>{source.platform}</small></div><div className="news-source-actions"><button aria-label={`去UP主主页 ${source.displayName || source.name}`} onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")}><ExternalLink /></button><button aria-label={`编辑资料 ${source.displayName || source.name}`} onClick={() => { setEditingSource(source); setProfileDraft({ displayName: source.displayName || "", profileDescription: source.profileDescription || "", tags: (source.tags || []).join(",") }); }}><Pencil /></button><button aria-label={`删除 ${source.displayName || source.name}`} onClick={() => { repo.removeSource(source.id); reload(); }}><Trash2 /></button></div></article>)}</div>
        </aside>
        <button className="news-refresh" onClick={runRefresh} disabled={refreshing}><RefreshCw aria-hidden="true" />{refreshing ? "刷新中…" : "刷新"}</button>
        <button className="news-refresh" onClick={() => { setScheduleDraft(repo.getSchedule()); setScheduleError(""); setScheduleOpen(true); }}>定点刷新{repo.getSchedule().times.length ? ` · ${repo.getSchedule().times.join(" / ")}` : ""}</button>
      </div>
      <section className="news-feed" aria-live="polite">
        <div className="news-notice" aria-live="polite">{notice || "尚未刷新，请点击刷新获取最新消息"}</div>
        {sortedItems.length === 0 ? <div className="news-empty"><h2>还没有新消息</h2><p>订阅后发布的新内容会显示在这里</p></div> : <>
          <div className="news-card-rail" data-testid="news-card-rail" aria-label="今日消息列表">
            <div className="news-card-grid">{sortedItems.map((item) => {
              const itemKey = `${item.sourceId}-${item.id}`;
              const active = selectedItemId === itemKey;
              return <button className="news-card" key={itemKey} aria-label={`${item.sourceName}：${item.title}`} aria-expanded={active} onClick={(event) => { triggerCardRef.current = event.currentTarget; setSelectedItemId(itemKey); }}>
                <strong>{creatorName(item.sourceName)}</strong><small>{item.platform}</small><span>{item.title}</span>{item.summary && <p>{item.summary}</p>}<time>{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</time>
              </button>;
            })}</div>
          </div>
        </>}
      </section>
    </div>
    {selectedItem && <div className="news-detail-overlay" data-testid="news-detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
      <section className="news-detail-modal" role="dialog" aria-modal="true" aria-labelledby="news-detail-title">
        <button ref={closeButtonRef} className="news-detail-close" aria-label="关闭消息详情" onClick={closeDetail}><X /></button>
        <div className="news-detail-heading"><small>UP 主</small><strong>{creatorName(selectedItem.sourceName)}</strong><small>视频标题</small><h2 id="news-detail-title">{selectedItem.title}</h2></div>
        {selectedItem.summary && <div><h3>一句话总结</h3><p>{selectedItem.summary}</p></div>}
        {selectedItem.coreContent && selectedItem.coreContent.length >= 3 && <div><h3>核心内容</h3><ol>{selectedItem.coreContent.slice(0, 5).map((entry) => <li key={entry}>{entry}</li>)}</ol></div>}
        {selectedItem.whyItMatters && <div><h3>值得关注</h3><p>{selectedItem.whyItMatters}</p></div>}
        <div className="news-detail-meta"><small>{selectedItem.platform}</small><time dateTime={selectedItem.publishedAt}>发布时间：{new Date(selectedItem.publishedAt).toLocaleString("zh-CN")}</time></div>
        <a href={selectedItem.url} target="_blank" rel="noreferrer">查看原内容 <ExternalLink /></a>
      </section>
    </div>}
    {editingSource && <div className="news-detail-overlay"><section className="news-detail-modal" role="dialog" aria-label="编辑订阅资料"><button className="news-detail-close" aria-label="关闭编辑资料" onClick={() => setEditingSource(null)}><X /></button><h2>编辑订阅资料</h2><label>UP 主名称<input value={profileDraft.displayName} onChange={(event) => setProfileDraft({ ...profileDraft, displayName: event.target.value })} /></label><label>一句话定位<input value={profileDraft.profileDescription} onChange={(event) => setProfileDraft({ ...profileDraft, profileDescription: event.target.value })} /></label><label>分类标签（最多2个，逗号分隔）<input value={profileDraft.tags} onChange={(event) => setProfileDraft({ ...profileDraft, tags: event.target.value })} /></label><button className="news-refresh" onClick={() => { repo.updateSourceProfile(editingSource.id, { displayName: profileDraft.displayName, profileDescription: profileDraft.profileDescription, tags: profileDraft.tags.split(",") }); setEditingSource(null); reload(); }}>保存资料</button></section></div>}
    {scheduleOpen && <div className="news-detail-overlay"><section className="news-detail-modal" role="dialog" aria-label="定点刷新设置"><button className="news-detail-close" aria-label="关闭定点刷新设置" onClick={() => setScheduleOpen(false)}><X /></button><h2>定点刷新</h2><label className="news-schedule-toggle"><input type="checkbox" checked={scheduleDraft.enabled} onChange={(event) => setScheduleDraft({ ...scheduleDraft, enabled: event.target.checked })} /> 启用每日定点刷新</label><div className="news-schedule-times">{scheduleDraft.times.map((time, index) => { const [hour = "", minute = ""] = time.split(":"); const update = (nextHour: string, nextMinute: string) => { setScheduleError(""); setScheduleDraft({ ...scheduleDraft, times: scheduleDraft.times.map((value, itemIndex) => itemIndex === index ? `${nextHour}:${nextMinute}` : value) }); }; return <div key={index}><label>刷新时间<span className="news-time-inputs"><input type="text" inputMode="numeric" maxLength={2} placeholder="00" value={hour} onChange={(event) => update(event.target.value.replace(/\D/g, ""), minute)} /><b>:</b><input type="text" inputMode="numeric" maxLength={2} placeholder="00" value={minute} onChange={(event) => update(hour, event.target.value.replace(/\D/g, ""))} /></span></label>{scheduleDraft.times.length > 1 && <button className="news-schedule-remove" onClick={() => setScheduleDraft({ ...scheduleDraft, times: scheduleDraft.times.filter((_, itemIndex) => itemIndex !== index) })}>删除</button>}</div>; })}</div>{scheduleError && <p className="news-schedule-error">{scheduleError}</p>}<div className="news-schedule-actions">{scheduleDraft.times.length < 3 && <button className="news-schedule-add" onClick={() => setScheduleDraft({ ...scheduleDraft, times: [...scheduleDraft.times, ":"] })}>+ 添加时间点</button>}<button className="news-refresh" onClick={() => { const times = scheduleDraft.times.map((time) => { const [hour = "", minute = ""] = time.split(":"); return `${(hour || "00").padStart(2, "0")}:${(minute || "00").padStart(2, "0")}`; }); if (times.some((time) => { const [hour, minute] = time.split(":").map(Number); return hour > 23 || minute > 59; })) return setScheduleError("小时请输入 00–23，分钟请输入 00–59"); repo.saveSchedule({ ...scheduleDraft, times }); setScheduleOpen(false); reload(); }}>保存设置</button></div></section></div>}
  </section>;
}
