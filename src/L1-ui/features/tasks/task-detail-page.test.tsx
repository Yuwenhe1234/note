import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailPage } from "./task-detail-page";
import "../../../index.css";

const task = { id: "stm32", title: "学习 STM32", description: "从 GPIO 开始", goal: "完成点灯工程", objective: "掌握 GPIO 并完成点灯", type: "学习类", completed: false, priority: "medium" as const, durationHours: 1, domainMap: { prerequisites: ["C 语言"], coreConcepts: ["GPIO"], advancedTopics: ["中断"] }, resources: { systemResources: ["STM32 官方文档"], externalRecommendations: { websites: ["st.com"], upMasters: ["嵌入式频道"], communities: ["论坛"] } }, coreQuestions: ["GPIO 如何配置？"], steps: [{ id: "s1", title: "阅读 GPIO 文档", hours: 1, completed: false, questions: ["寄存器作用是什么？"] }] };

describe("TaskDetailPage", () => {
  it("renders task context and updates progress when a step is completed", () => {
    render(<TaskDetailPage task={task} onBack={vi.fn()} onSave={vi.fn()} onRegenerate={vi.fn()} />);
    const back = screen.getByRole("button", { name: "返回任务清单" });
    expect(back).toHaveTextContent("");
    expect(back.closest(".task-detail-header")).toBeNull();
    expect(getComputedStyle(back.closest(".task-detail-topbar")!).gridTemplateColumns).toBe("150px minmax(0, 1fr)");
    expect(getComputedStyle(document.querySelector(".task-detail-grid")!).columnGap).toBe("16px");
    expect(screen.getByRole("region", { name: "思维导图" })).toBeInTheDocument();
    expect(screen.getByText("推荐学习资源")).toBeInTheDocument();
    expect(screen.getByDisplayValue("STM32 官方文档")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "学习 STM32" })).toBeInTheDocument();
    expect(screen.queryByLabelText("任务标题")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成步骤 1" }));
    expect(screen.getByText("1/1 · 100%")).toBeInTheDocument();
  });

  it("opens the full mind map on double click", () => {
    render(<TaskDetailPage task={task} onBack={vi.fn()} onSave={vi.fn()} onRegenerate={vi.fn()} />);
    fireEvent.doubleClick(screen.getByRole("region", { name: "思维导图" }));
    expect(screen.getByRole("dialog", { name: "完整思维导图" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭完整思维导图" }));
    expect(screen.queryByRole("dialog", { name: "完整思维导图" })).not.toBeInTheDocument();
  });
});
