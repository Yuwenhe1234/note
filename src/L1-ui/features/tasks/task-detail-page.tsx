import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { taskProgress, type Task, type TaskStep } from "../../../L4-data/task-model";
import { AnalysisStepEditor } from "./analysis-step-editor";

export function TaskDetailPage({ task, onBack, onSave, onRegenerate }: { task: Task; onBack: () => void; onSave: (task: Task) => void; onRegenerate: () => void }) {
  const [draft, setDraft] = useState(task);
  const [editingMeta, setEditingMeta] = useState(false);
  const progress = useMemo(() => taskProgress(draft.steps), [draft.steps]);
  const updateSteps = (steps: TaskStep[]) => setDraft((current) => ({ ...current, steps, durationHours: steps.reduce((sum, step) => sum + step.hours, 0), completed: taskProgress(steps).done }));
  const map = draft.domainMap || { prerequisites: [], coreConcepts: [], advancedTopics: [] };
  const resources = draft.resources || { systemResources: [], externalRecommendations: { websites: [], upMasters: [], communities: [] } };
  const questionsByStepId = Object.fromEntries(draft.steps.map((step) => [step.id, step.questions || []]));
  return <section className="task-detail-page min-h-screen bg-[#0B0F14] text-slate-100">
    <header className="task-detail-header">
      <button className="task-detail-back" onClick={onBack}><ArrowLeft /> 返回任务清单</button>
      <div className="task-detail-title"><div><span className="task-detail-type">{draft.type || "未分类"}</span>{editingMeta ? <input aria-label="任务标题" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /> : <h1>{draft.title}</h1>}<button className="task-detail-edit" aria-label="编辑任务标题" onClick={() => setEditingMeta((value) => !value)}>{editingMeta ? "完成编辑" : "编辑"}</button></div><div className="task-detail-objective"><small>完成目标</small>{editingMeta ? <textarea aria-label="完成目标" value={draft.objective || draft.goal} onChange={(event) => setDraft({ ...draft, objective: event.target.value, goal: event.target.value })} /> : <p>{draft.objective || draft.goal || "暂无完成目标"}</p>}</div></div>
      <div className="task-detail-progress"><span>{progress.completed}/{progress.total} 步骤完成 · {progress.percent}%</span><div><i style={{ width: `${progress.percent}%` }} /></div></div>
    </header>
    <main className="task-detail-grid">
      <aside className="task-detail-left"><section><h2>领域地图</h2><MapBlock title="前置知识" items={map.prerequisites} /><MapBlock title="核心概念" items={map.coreConcepts} /><MapBlock title="进阶方向" items={map.advancedTopics} /></section><section><h2>学习资源</h2><MapBlock title="系统主资源" items={resources.systemResources} /><MapBlock title="网站" items={resources.externalRecommendations.websites} /><MapBlock title="UP 主 / 社区" items={[...resources.externalRecommendations.upMasters, ...resources.externalRecommendations.communities]} /></section></aside>
      <section className="task-detail-right"><section><h2>全局核心问题</h2><ol className="task-detail-questions">{(draft.coreQuestions || []).map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}{!draft.coreQuestions?.length && <li>暂无 AI 补充问题</li>}</ol></section><section><h2>执行步骤</h2><AnalysisStepEditor steps={draft.steps} onChange={updateSteps} questionsByStepId={questionsByStepId} onToggle={(id) => updateSteps(draft.steps.map((step) => step.id === id ? { ...step, completed: !step.completed } : step))} /></section></section>
    </main>
    <footer className="task-detail-footer"><button className="btn-secondary" onClick={onRegenerate}><RefreshCw /> 让 AI 重新生成</button><button className="primary" onClick={() => onSave(draft)}><Check /> 确认并保存</button></footer>
  </section>;
}

function MapBlock({ title, items }: { title: string; items: string[] }) { return <div className="task-detail-map-block"><small>{title}</small>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>暂无 AI 补充信息</p>}</div>; }
