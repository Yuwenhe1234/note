export type TaskAnalysisPromptInput = {
  title: string;
  description?: string;
  duration?: string;
  notes?: string;
  minSteps?: number;
  maxSteps?: number;
};

export type TaskAnalysisMessage = { role: "system" | "user"; content: string };

export function buildTaskAnalysisMessages(input: TaskAnalysisPromptInput, retry = false): TaskAnalysisMessage[] {
  const minSteps = input.minSteps ?? 2;
  const maxSteps = input.maxSteps ?? 8;
  const system = `你是高级任务拆解 Agent。${TASK_ANALYSIS_SKILL}
只返回合法 JSON，不要 Markdown 或解释：{"summary":"简短总结","type":"学习类","goal":{"description":"可验证完成目标","completionCriteria":["可检查标准"]},"priority":"high|medium|low","estimatedHours":2.5,"domainMap":{"prerequisites":[],"coreConcepts":[],"advancedTopics":[]},"flowchart":{"nodes":[{"id":"id","label":"依赖节点"}],"edges":[{"from":"id","to":"id2"}]},"resources":[{"name":"资源名","platform":"Bilibili|抖音|官方文档|网站课程|GitHub|社区","url":"","searchQuery":"具体搜索词","reason":"为什么需要","stage":"对应阶段"}],"notes":[{"title":"具体风险","description":"具体规避办法","level":"important|warning|risk"}],"coreQuestions":["问题"],"steps":[{"title":"不超过24字的具体动作","hours":0.5,"description":"怎么做及为什么做","completionCriteria":"可验证的完成标准","questions":["本步骤核心问题"]}]}。
要求：生成 ${minSteps}-${maxSteps} 个步骤。用户填写的期望时长是本次任务的实际时间预算，必须合理分配到各步骤，estimatedHours 和所有步骤 hours 总和必须严格等于该预算；hours 使用 0.25 小时刻度，不设固定单步 4 小时上限。必须理解任务内容和注意事项，并把其中的目标、限制、风险、资源或提醒落实到 goal、具体步骤、description 或 completionCriteria。步骤标题必须包含与主题直接相关的具体动作，不得直接使用上述通用方法阶段名。type 必须为学习类、开发/项目类、写作/内容类、规划/准备类或生活/习惯类之一；coreQuestions 生成 10 个引导问题；每步 questions 生成 1-3 个核心问题。无法明确分类时选择最接近最终产出的类别。${retry ? "上一次输出校验失败，必须修正 JSON、步骤数和时长总和。" : ""}`;
  const user = `任务名称：${input.title}\n任务内容：${input.description || "无"}\n期望时长：${input.duration || "2-3 小时"}\n注意事项：${input.notes || "无"}`;
  return [{ role: "system", content: system }, { role: "user", content: user }];
}
import { TASK_ANALYSIS_SKILL } from "./task-analysis-skill";
