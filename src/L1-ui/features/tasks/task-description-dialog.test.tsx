import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDescriptionDialog } from "./task-description-dialog";

describe("TaskDescriptionDialog", () => {
  it("saves description only after confirmation", () => {
    const onSave = vi.fn();
    render(<TaskDescriptionDialog description="原说明" goal="原目标" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "编辑任务说明" }));
    fireEvent.change(screen.getByLabelText("任务说明内容"), { target: { value: "新说明" } });
    fireEvent.change(screen.getByLabelText("任务完成目标"), { target: { value: "通过验收" } });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "保存说明" }));
    expect(onSave).toHaveBeenCalledWith({ description: "新说明", goal: "通过验收" });
  });

  it("discards changes when cancelled", () => {
    const onSave = vi.fn();
    render(<TaskDescriptionDialog description="原说明" goal="原目标" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "编辑任务说明" }));
    fireEvent.change(screen.getByLabelText("任务说明内容"), { target: { value: "不保存" } });
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
