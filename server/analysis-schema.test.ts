import { describe, expect, it } from "vitest";
import { parseAnalysis } from "./analysis-schema";

describe("task analysis schema", () => {
  it("accepts a category-aware detail payload with a dependency flowchart", () => {
    const raw = JSON.stringify({ summary: "运放补偿学习路径", type: "学习类", goal: { description: "完成补偿仿真并解释稳定性", completionCriteria: ["画出 Bode 图", "仿真通过"] }, priority: "medium", domainMap: { prerequisites: ["负反馈"], coreConcepts: ["极点零点"], advancedTopics: ["容性负载"] }, flowchart: { nodes: [{ id: "feedback", label: "负反馈" }, { id: "bode", label: "Bode 图" }], edges: [{ from: "feedback", to: "bode" }] }, steps: [{ title: "绘制环路 Bode 图", hours: 0.5, description: "在 LTspice 中测量环路增益", completionCriteria: "导出增益与相位曲线", questions: ["相位裕度如何读取？"] }], resources: [{ name: "运放稳定性应用笔记", platform: "官方文档", url: "", searchQuery: "op amp stability compensation application note", reason: "理解补偿原理", stage: "核心概念" }], coreQuestions: ["极点如何影响相位？"], notes: [{ title: "仿真模型", description: "确认运放宏模型可用", level: "risk" }], estimatedHours: 0.5 });
    expect(parseAnalysis(raw).flowchart!.nodes).toHaveLength(2);
  });
  it("accepts a complete model response", () => {
    const analysis = parseAnalysis('{"summary":"学习计划","goal":"完成练习并全部通过","priority":"medium","estimatedHours":1.5,"steps":[{"title":"阅读文档","hours":0.5,"description":"阅读核心章节","completionCriteria":"写出摘要"},{"title":"完成练习","hours":1,"description":"完成配套练习","completionCriteria":"全部通过"}]}');
    expect(analysis.goal).toBe("完成练习并全部通过");
    expect(analysis.estimatedHours).toBe(1.5);
    expect(analysis.steps[0]).toMatchObject({ title: "阅读文档", hours: 0.5 });
  });
  it("rejects a missing completion goal", () => {
    expect(() => parseAnalysis('{"summary":"x","priority":"medium","estimatedHours":0.5,"steps":[{"title":"a","hours":0.25,"description":"a","completionCriteria":"a"},{"title":"b","hours":0.25,"description":"b","completionCriteria":"b"}]}')).toThrow("分析结果格式异常");
  });
  it("rejects totals that do not match step hours", () => {
    expect(() => parseAnalysis('{"summary":"x","priority":"medium","estimatedHours":2,"steps":[{"title":"a","hours":0.5,"description":"a","completionCriteria":"a"},{"title":"b","hours":0.5,"description":"b","completionCriteria":"b"}]}')).toThrow("分析结果格式异常");
  });
  it("rejects non-quarter-hour values and overly long steps", () => {
    expect(() => parseAnalysis('{"summary":"x","priority":"medium","estimatedHours":4.1,"steps":[{"title":"a","hours":4.1,"description":"a","completionCriteria":"a"},{"title":"b","hours":0.25,"description":"b","completionCriteria":"b"}]}')).toThrow("分析结果格式异常");
  });
  it("accepts optional task detail fields from AI analysis", () => {
    const raw = JSON.stringify({ summary: "学习计划", goal: "完成实践", priority: "medium", estimatedHours: 1, type: "学习类", domainMap: { prerequisites: ["C 语言"], coreConcepts: ["GPIO"], advancedTopics: ["中断"] }, resources: { systemResources: ["STM32 官方文档"], externalRecommendations: { websites: ["st.com"], upMasters: ["嵌入式频道"], communities: ["论坛"] } }, coreQuestions: ["GPIO 如何工作？"], steps: [{ title: "阅读 GPIO 文档", hours: 1, description: "通读章节", completionCriteria: "写出笔记", questions: ["寄存器作用是什么？"] }] });
    const analysis = parseAnalysis(raw);
    expect(analysis.type).toBe("学习类");
    expect(analysis.steps[0].questions).toEqual(["寄存器作用是什么？"]);
  });
  it("accepts a long task whose step hours match the actual budget", () => {
    const steps = Array.from({ length: 5 }, (_, index) => ({ title: `具体步骤${index + 1}`, hours: 4, description: "结合任务内容执行", completionCriteria: "完成可检查产出" }));
    expect(parseAnalysis(JSON.stringify({ summary: "长期学习", goal: "完成学习与实践", priority: "medium", estimatedHours: 20, steps })).estimatedHours).toBe(20);
  });
});
