import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function TaskDescriptionDialog({ description, goal, onSave }: { description: string; goal: string; onSave: (details: { description: string; goal: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(description);
  const [goalDraft, setGoalDraft] = useState(goal);
  const show = () => { setDraft(description); setGoalDraft(goal); setOpen(true); };
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  return (
    <div className="task-description-field">
      <span>任务内容</span>
      <button type="button" className="task-description-summary" aria-label="编辑任务说明" onClick={show}>
        {description.trim() || goal.trim() || "点击填写任务说明"}
      </button>
      {open && (
        <div className="description-overlay" role="dialog" aria-modal="true" aria-label="任务说明编辑窗口">
          <section className="description-dialog">
            <button type="button" className="close" aria-label="关闭任务说明" onClick={close}><X /></button>
            <em>TASK DESCRIPTION</em>
            <h3>任务说明</h3>
            <textarea aria-label="任务说明内容" value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
            <label className="task-goal-editor">任务完成目标<textarea aria-label="任务完成目标" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} placeholder="完成后需要达到什么效果？" /></label>
            <div className="description-dialog-actions">
              <button type="button" className="btn-secondary" onClick={close}>取消</button>
              <button type="button" className="primary" onClick={() => { onSave({ description: draft.trim(), goal: goalDraft.trim() }); close(); }}>保存说明</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
