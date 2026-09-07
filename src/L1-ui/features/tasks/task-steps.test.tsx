import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskSteps } from "./task-steps";

describe("TaskSteps", () => {
  it("renders display-only bubbles and completes only the selected step", () => {
    const onChange = vi.fn();
    const steps = [
      { id: "1", title: "步骤一", hours: 0.25, completed: false },
      { id: "2", title: "步骤二", hours: 0.75, completed: false },
    ];
    const { rerender } = render(
      <TaskSteps steps={steps} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "完成步骤：步骤一" }));
    expect(onChange.mock.calls[0][0][0].completed).toBe(true);
    expect(onChange.mock.calls[0][0][1].completed).toBe(false);
    rerender(
      <TaskSteps steps={onChange.mock.calls[0][0]} onChange={onChange} />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("0.25 小时")).toBeInTheDocument();
    expect(screen.getByText("0.75 小时")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
