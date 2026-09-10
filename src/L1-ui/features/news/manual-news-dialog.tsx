import { useState } from "react";
import type { ManualNewsInput, NewsSource } from "../../../L4-data/news-model";

export function ManualNewsDialog({ sources, onClose, onSave }: { sources: NewsSource[]; onClose: () => void; onSave: (input: ManualNewsInput, summarize: boolean) => Promise<void> }) {
  const [input, setInput] = useState<ManualNewsInput>({ sourceId: sources[0]?.id || "", url: "", title: "", body: "" });
  const [summarize, setSummarize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true); setError("");
    try { await onSave(input, summarize); onClose(); }
    catch (value) { setError(value instanceof Error ? value.message : "保存消息失败"); }
    finally { setBusy(false); }
  };
  return <div className="news-detail-overlay"><section className="news-detail-modal" role="dialog" aria-label="手动添加消息">
    <h2>手动添加消息</h2>
    <label>订阅来源<select aria-label="订阅来源" value={input.sourceId} onChange={(event) => setInput({ ...input, sourceId: event.target.value })}>{sources.map((source) => <option key={source.id} value={source.id}>{source.displayName || source.name}</option>)}</select></label>
    <label>内容链接<input aria-label="内容链接" value={input.url} onChange={(event) => setInput({ ...input, url: event.target.value })} placeholder="https://..." /></label>
    <label>消息标题<input aria-label="消息标题" value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} /></label>
    <label>消息正文<textarea aria-label="消息正文" value={input.body} onChange={(event) => setInput({ ...input, body: event.target.value })} /></label>
    <label><input aria-label="使用 AI 生成摘要" type="checkbox" checked={summarize} onChange={(event) => setSummarize(event.target.checked)} /> 使用 AI 生成摘要</label>
    {error && <p className="news-schedule-error" aria-live="polite">{error}</p>}
    <div className="news-schedule-actions"><button onClick={onClose}>取消</button><button className="news-refresh" disabled={busy || !sources.length} onClick={submit}>{busy ? "保存中…" : "保存消息"}</button></div>
  </section></div>;
}
