import { describe, expect, it } from "vitest";
import { parseAnalysis } from "./analysis-schema";

describe("task analysis schema", () => {
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
});
