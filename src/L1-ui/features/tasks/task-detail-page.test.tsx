import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailPage } from "./task-detail-page";

const task = { id: "stm32", title: "学习 STM32", description: "从 GPIO 开始", goal: "完成点灯工程", objective: "掌握 GPIO 并完成点灯", type: "学习类", completed: false, priority: "medium" as const, durationHours: 1, domainMap: { prerequisites: ["C 语言"], coreConcepts: ["GPIO"], advancedTopics: ["中断"] }, resources: { systemResources: ["STM32 官方文档"], externalRecommendations: { websites: ["st.com"], upMasters: ["嵌入式频道"], communities: ["论坛"] } }, coreQuestions: ["GPIO 如何配置？"], steps: [{ id: "s1", title: "阅读 GPIO 文档", hours: 1, completed: false, questions: ["寄存器作用是什么？"] }] };

describe("TaskDetailPage", () => {
  it("renders task context and updates progress when a step is completed", () => {
    render(<TaskDetailPage task={task} onBack={vi.fn()} onSave={vi.fn()} onRegenerate={vi.fn()} />);
    expect(screen.getByText("领域地图")).toBeInTheDocument();
    expect(screen.getByText("STM32 官方文档")).toBeInTheDocument();
    expect(screen.getByText("GPIO 如何配置？")).toBeInTheDocument();
    expect(screen.getByText("寄存器作用是什么？")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "学习 STM32" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑任务标题" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成步骤 1" }));
    expect(screen.getByText("1/1 步骤完成 · 100%")).toBeInTheDocument();
  });
});
