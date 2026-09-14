import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { taskProgress, type Task, type TaskStep } from "../../../L4-data/task-model";
import { AnalysisStepEditor } from "./analysis-step-editor";
import { TaskMindMap } from "./task-mind-map";

export function TaskDetailPage({ task, onBack, onSave, onRegenerate }: { task: Task; onBack: () => void; onSave: (task: Task) => void; onRegenerate: () => void }) {
  const [draft, setDraft] = useState(task);
  const [mindMapOpen, setMindMapOpen] = useState(false);
  const progress = useMemo(() => taskProgress(draft.steps), [draft.steps]);
  const updateSteps = (steps: TaskStep[]) => setDraft((current) => ({ ...current, steps, durationHours: steps.reduce((sum, step) => sum + step.hours, 0), completed: taskProgress(steps).done }));
  const resources = draft.resources || { systemResources: [], externalRecommendations: { websites: [], upMasters: [], communities: [] } };
  return <section className="task-detail-page">
    <div className="task-detail-topbar"><button className="task-detail-back" aria-label="返回任务清单" onClick={onBack}><ArrowLeft /></button><header className="task-detail-header">
      <div className="task-detail-title"><div>{draft.type ? <span className="task-detail-type">{draft.type}</span> : null}<textarea rows={2} maxLength={32} className={`task-title-input ${draft.title.length > 18 ? "is-long" : ""}`} aria-label="任务名称" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div><div className="task-detail-objective"><small>完成目标</small><textarea aria-label="完成目标" value={draft.objective || draft.goal} onChange={(event) => setDraft({ ...draft, objective: event.target.value, goal: event.target.value })} /></div></div>
    </header></div>
    <main className="task-detail-grid">
      <aside className="task-detail-left"><TaskMindMap value={draft.mindMap || { nodes: [], edges: [] }} onChange={(mindMap) => setDraft({ ...draft, mindMap })} onDoubleClick={() => setMindMapOpen(true)} /><section><h2>推荐学习资源</h2><ResourceGroup label="B站" value={resources.externalRecommendations.upMasters} onChange={(upMasters) => setDraft({ ...draft, resources: { ...resources, externalRecommendations: { ...resources.externalRecommendations, upMasters } } })} /><ResourceGroup label="抖音" value={resources.externalRecommendations.communities} onChange={(communities) => setDraft({ ...draft, resources: { ...resources, externalRecommendations: { ...resources.externalRecommendations, communities } } })} /><ResourceGroup label="网站" value={resources.externalRecommendations.websites} onChange={(websites) => setDraft({ ...draft, resources: { ...resources, externalRecommendations: { ...resources.externalRecommendations, websites } } })} /></section></aside>
      <section className="task-detail-right"><section className="task-detail-notes"><h2>需要注意的点</h2><textarea aria-label="需要注意的点" value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="输入限制、风险或提醒事项" /></section><section><div className="task-detail-steps-heading"><h2>执行步骤</h2><span>{progress.completed}/{progress.total} · {progress.percent}%</span></div><AnalysisStepEditor steps={draft.steps} onChange={updateSteps} onToggle={(id) => updateSteps(draft.steps.map((step) => step.id === id ? { ...step, completed: !step.completed } : step))} /></section></section>
    </main>
    <footer className="task-detail-footer"><button className="btn-secondary" onClick={onRegenerate}><RefreshCw /> 让 AI 重新生成</button><button className="primary" onClick={() => onSave(draft)}><Check /> 确认并保存</button></footer>
    {mindMapOpen && <div className="mind-map-overlay" role="dialog" aria-label="完整思维导图"><button className="mind-map-close" aria-label="关闭完整思维导图" onClick={() => setMindMapOpen(false)}><X /></button><TaskMindMap className="task-mind-map-fullscreen" value={draft.mindMap || { nodes: [], edges: [] }} onChange={(mindMap) => setDraft({ ...draft, mindMap })} /></div>}
  </section>;
}

function ResourceGroup({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) { const links = value.filter((item) => /^https?:\/\//i.test(item)); return <div className="task-detail-resource"><small>{label}</small>{links.length > 0 && <div className="resource-link-list">{links.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a>)}</div>}<textarea value={value.join("\n")} onChange={(event) => onChange(event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))} placeholder="每行一条完整网址" /></div>; }
