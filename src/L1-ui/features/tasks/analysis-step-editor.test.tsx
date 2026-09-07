import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisStepEditor } from "./analysis-step-editor";

describe("AnalysisStepEditor", () => {
  it("edits titles and opens hour editing only on double click", () => {
    const onChange = vi.fn();
    const steps = [{ id: "1", title: "阅读", hours: 6.25, completed: false }];
    render(<AnalysisStepEditor steps={steps} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("步骤 1 标题"), { target: { value: "练习" } });
    expect(onChange.mock.calls[0][0][0].title).toBe("练习");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("button", { name: "修改步骤 1 时长" }));
    fireEvent.change(screen.getByLabelText("步骤 1 时长"), { target: { value: "6.4" } });
    fireEvent.keyDown(screen.getByLabelText("步骤 1 时长"), { key: "Enter" });
    expect(onChange.mock.calls[1][0][0].hours).toBe(6.5);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("reorders steps by dragging the handle", () => {
    const onChange = vi.fn();
    const steps = [
      { id: "1", title: "一", hours: 0.25, completed: true },
      { id: "2", title: "二", hours: 0.5, completed: false },
      { id: "3", title: "三", hours: 0.75, completed: false },
    ];
    render(<AnalysisStepEditor steps={steps} onChange={onChange} />);
    fireEvent.dragStart(screen.getByLabelText("拖动步骤 1"));
    fireEvent.dragOver(screen.getByTestId("step-edit-row-3"));
    fireEvent.drop(screen.getByTestId("step-edit-row-3"));
    expect(onChange.mock.calls[0][0].map((step: { id: string }) => step.id)).toEqual(["2", "3", "1"]);
    expect(onChange.mock.calls[0][0][2]).toEqual(steps[0]);
  });

  it("reorders steps from bottom to top", () => {
    const onChange = vi.fn();
    const steps = [
      { id: "1", title: "一", hours: 0.25, completed: false },
      { id: "2", title: "二", hours: 0.5, completed: false },
      { id: "3", title: "三", hours: 0.75, completed: true },
    ];
    render(<AnalysisStepEditor steps={steps} onChange={onChange} />);
    fireEvent.dragStart(screen.getByLabelText("拖动步骤 3"));
    fireEvent.dragOver(screen.getByTestId("step-edit-row-1"));
    fireEvent.drop(screen.getByTestId("step-edit-row-1"));
    expect(onChange.mock.calls[0][0].map((step: { id: string }) => step.id)).toEqual(["3", "1", "2"]);
    expect(onChange.mock.calls[0][0][0]).toEqual(steps[2]);
  });

  it("adds and deletes steps but keeps at least one", () => {
    const onChange = vi.fn();
    const steps = [{ id: "1", title: "阅读", hours: 0.5, completed: false }];
    const { rerender } = render(<AnalysisStepEditor steps={steps} onChange={onChange} />);
    expect(screen.getByLabelText("删除步骤 1")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "添加步骤" }));
    const added = onChange.mock.calls[0][0];
    expect(added).toHaveLength(2);
    expect(added[1]).toMatchObject({ title: "步骤 2", hours: 0.25 });
    rerender(<AnalysisStepEditor steps={added} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("删除步骤 2"));
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1);
  });
});
