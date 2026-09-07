import { useEffect, useRef, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { normalizeHours, type TaskStep } from "../../../L4-data/task-model";

function StepDurationEditor({ step, index, onCommit }: { step: TaskStep; index: number; onCommit: (hours: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(step.hours));
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
  const cancel = () => { setDraft(String(step.hours)); setInvalid(false); setEditing(false); };
  const save = () => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value <= 0) { setInvalid(true); return; }
    onCommit(normalizeHours(value));
    setEditing(false);
    setInvalid(false);
  };
  if (!editing) return (
    <button type="button" className="step-duration-display" aria-label={`修改步骤 ${index + 1} 时长`} onDoubleClick={() => { setDraft(String(step.hours)); setEditing(true); }}>
      {step.hours} 小时
    </button>
  );
  return <input ref={inputRef} className={`step-duration-input ${invalid ? "invalid" : ""}`} type="text" inputMode="decimal" aria-label={`步骤 ${index + 1} 时长`} value={draft} onChange={(event) => { setDraft(event.target.value); setInvalid(false); }} onBlur={save} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") cancel(); }} />;
}

export function AnalysisStepEditor({ steps, onChange }: { steps: TaskStep[]; onChange: (steps: TaskStep[]) => void }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const update = (id: string, updates: Partial<TaskStep>) => onChange(steps.map((step) => step.id === id ? { ...step, ...updates } : step));
  const drop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return setDraggedId(null);
    const dragged = steps.find((step) => step.id === draggedId);
    if (!dragged) return;
    const draggedIndex = steps.findIndex((step) => step.id === draggedId);
    const originalTargetIndex = steps.findIndex((step) => step.id === targetId);
    const without = steps.filter((step) => step.id !== draggedId);
    const targetIndex = without.findIndex((step) => step.id === targetId);
    const insertionIndex = draggedIndex > originalTargetIndex ? targetIndex : targetIndex + 1;
    without.splice(insertionIndex, 0, dragged);
    onChange(without);
    setDraggedId(null);
    setDropTargetId(null);
  };
  return (
    <div className="analysis-step-editor">
      <div className="analysis-step-editor-list">
        {steps.map((step, index) => (
          <div data-testid={`step-edit-row-${step.id}`} className={`analysis-step-edit-row ${draggedId === step.id ? "dragging" : ""} ${dropTargetId === step.id ? "drop-target" : ""}`} key={step.id} onDragOver={(event) => { event.preventDefault(); setDropTargetId(step.id); }} onDrop={() => drop(step.id)}>
            <button type="button" className="step-drag-handle" aria-label={`拖动步骤 ${index + 1}`} draggable onDragStart={() => setDraggedId(step.id)} onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }}><GripVertical aria-hidden="true" /></button>
            <span className="step-order">{String(index + 1).padStart(2, "0")}</span>
            <input aria-label={`步骤 ${index + 1} 标题`} value={step.title} onChange={(event) => update(step.id, { title: event.target.value })} />
            <StepDurationEditor step={step} index={index} onCommit={(hours) => update(step.id, { hours })} />
            <button type="button" className="step-delete" aria-label={`删除步骤 ${index + 1}`} disabled={steps.length <= 1} onClick={() => onChange(steps.filter((item) => item.id !== step.id))}><Trash2 /></button>
          </div>
        ))}
      </div>
      <button type="button" className="add-step-button" onClick={() => onChange([...steps, { id: crypto.randomUUID(), title: `步骤 ${steps.length + 1}`, hours: 0.25, completed: false }])}><Plus /> 添加步骤</button>
    </div>
  );
}
