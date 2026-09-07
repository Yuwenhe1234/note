import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetInlineEditor } from "./widget-inline-editor";

describe("WidgetInlineEditor", () => {
  it("validates and submits a new todo", () => {
    const onSave = vi.fn();
    render(<WidgetInlineEditor mode={{ kind: "todo" }} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "保存待办" }));
    expect(screen.getByText("请输入待办内容")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("待办内容"), { target: { value: "买牛奶" } });
    fireEvent.change(screen.getByLabelText("提醒时间"), { target: { value: "18:30" } });
    fireEvent.click(screen.getByRole("button", { name: "保存待办" }));
    expect(onSave).toHaveBeenCalledWith({ kind: "todo", content: "买牛奶", reminderTime: "18:30" });
  });

  it("edits task fields and can cancel", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <WidgetInlineEditor
        mode={{ kind: "task", task: { id: "t1", title: "旧标题", description: "旧说明", goal: "旧目标" } }}
        onCancel={onCancel}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText("任务标题"), { target: { value: "新标题" } });
    fireEvent.click(screen.getByRole("button", { name: "保存任务" }));
    expect(onSave).toHaveBeenCalledWith({
      kind: "task",
      taskId: "t1",
      title: "新标题",
      description: "旧说明",
      goal: "旧目标",
    });
    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
