import { describe, expect, it } from "vitest";
import { buildTaskAnalysisMessages } from "./task-analysis-prompt";

describe("task analysis prompt", () => {
  it("contains all category workflows and preserves task constraints", () => {
    const messages = buildTaskAnalysisMessages({ title: "学习 STM32", description: "从零点灯", duration: "3 小时", notes: "使用官方资料", minSteps: 5, maxSteps: 7 });
    const prompt = messages.map((message) => message.content).join("\n");
    for (const category of ["学习类", "开发/项目类", "写作/内容类", "规划/准备类", "生活/习惯类"]) expect(prompt).toContain(category);
    for (const phase of ["明确目标与产出", "领域地图", "系统主资源", "最小知识框架", "问题驱动", "输出倒逼输入", "验证和纠错"]) expect(prompt).toContain(phase);
    expect(prompt).toContain("学习 STM32");
    expect(prompt).toContain("5-7 个");
    expect(prompt).toContain("completionCriteria");
    expect(prompt).toContain("实际时间预算");
    expect(prompt).toContain("任务内容和注意事项");
  });
});
