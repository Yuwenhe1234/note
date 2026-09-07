import { useState } from "react";

type EditorMode =
  | { kind: "todo"; todo?: { id: string; content: string; reminderTime: string } }
  | {
      kind: "task";
      task: { id: string; title: string; description: string; goal: string };
    };

export type WidgetEditorValue =
  | { kind: "todo"; todoId?: string; content: string; reminderTime: string }
  | {
      kind: "task";
      taskId: string;
      title: string;
      description: string;
      goal: string;
    };

export function WidgetInlineEditor({
  mode,
  onCancel,
  onSave,
}: {
  mode: EditorMode;
  onCancel: () => void;
  onSave: (value: WidgetEditorValue) => void;
}) {
  const [content, setContent] = useState(mode.kind === "todo" ? mode.todo?.content || "" : "");
  const [reminderTime, setReminderTime] = useState(mode.kind === "todo" ? mode.todo?.reminderTime || "" : "");
  const [title, setTitle] = useState(mode.kind === "task" ? mode.task.title : "");
  const [description, setDescription] = useState(
    mode.kind === "task" ? mode.task.description : "",
  );
  const [goal, setGoal] = useState(mode.kind === "task" ? mode.task.goal : "");
  const [error, setError] = useState("");

  const submit = () => {
    if (mode.kind === "todo") {
      if (!content.trim()) return setError("请输入待办内容");
      onSave({
        kind: "todo",
        ...(mode.todo ? { todoId: mode.todo.id } : {}),
        content: content.trim(),
        reminderTime,
      });
      return;
    }
    if (!title.trim()) return setError("请输入任务标题");
    onSave({
      kind: "task",
      taskId: mode.task.id,
      title: title.trim(),
      description: description.trim(),
      goal: goal.trim(),
    });
  };

  return (
    <div className="widget-inline-editor" role="dialog" aria-modal="true">
      <div className="widget-inline-editor-header">
        <strong>{mode.kind === "todo" ? (mode.todo ? "编辑待办" : "新增待办") : "编辑任务"}</strong>
        <button type="button" onClick={onCancel} aria-label="取消编辑">×</button>
      </div>
      {mode.kind === "todo" ? (
        <>
          <label>待办内容<input aria-label="待办内容" value={content} onChange={(event) => setContent(event.target.value)} autoFocus /></label>
          <label>提醒时间<input aria-label="提醒时间" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label>
        </>
      ) : (
        <>
          <label>任务标题<input aria-label="任务标题" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
          <label>任务说明<textarea aria-label="任务说明" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label>完成目标<textarea aria-label="完成目标" value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
        </>
      )}
      {error && <p className="widget-inline-editor-error">{error}</p>}
      <button type="button" className="widget-inline-editor-save" onClick={submit}>
        {mode.kind === "todo" ? "保存待办" : "保存任务"}
      </button>
    </div>
  );
}
