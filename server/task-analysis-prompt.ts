export type TaskAnalysisPromptInput = {
  title: string;
  description?: string;
  duration?: string;
  notes?: string;
  minSteps?: number;
  maxSteps?: number;
};

export type TaskAnalysisMessage = { role: "system" | "user"; content: string };

const WORKFLOWS = `先判断任务最符合哪个类别，再严格使用该类别的拆解逻辑：
学习类：明确目标与产出 → 领域地图 → 找系统主资源 → 建最小知识框架 → 问题驱动学习 → 输出倒逼输入 → 验证和纠错。
开发/项目类：明确需求与验收标准 → 技术选型与调研 → 搭建环境 → 核心功能开发 → 联调与测试 → 部署与复盘。
写作/内容类：明确受众与目标 → 确定主题与大纲 → 收集素材 → 撰写初稿 → 修订润色 → 发布与反馈。
规划/准备类：明确目标与现状 → 收集信息 → 制定计划 → 执行准备 → 模拟预演 → 复盘调整。
生活/习惯类：设定具体目标 → 拆解微小习惯 → 设置触发条件 → 执行并记录 → 周度复盘。`;

export function buildTaskAnalysisMessages(input: TaskAnalysisPromptInput, retry = false): TaskAnalysisMessage[] {
  const minSteps = input.minSteps ?? 2;
  const maxSteps = input.maxSteps ?? 8;
  const system = `你是高级任务拆解 Agent。${WORKFLOWS}
只返回合法 JSON，不要 Markdown 或解释：{"summary":"简短总结","goal":"不超过80字的可验证完成目标","priority":"high|medium|low","estimatedHours":2.5,"steps":[{"title":"不超过24字的具体动作","hours":0.5,"description":"如何执行","completionCriteria":"可验证的完成标准"}]}。
要求：生成 ${minSteps}-${maxSteps} 个步骤。用户填写的期望时长是本次任务的实际时间预算，必须合理分配到各步骤，estimatedHours 和所有步骤 hours 总和必须严格等于该预算；hours 使用 0.25 小时刻度，不设固定单步 4 小时上限。必须理解任务内容和注意事项，并把其中的目标、限制、风险、资源或提醒落实到 goal、具体步骤、description 或 completionCriteria。步骤标题必须包含与主题直接相关的具体动作，不得直接使用上述通用方法阶段名。无法明确分类时选择最接近最终产出的类别。${retry ? "上一次输出校验失败，必须修正 JSON、步骤数和时长总和。" : ""}`;
  const user = `任务名称：${input.title}\n任务内容：${input.description || "无"}\n期望时长：${input.duration || "2-3 小时"}\n注意事项：${input.notes || "无"}`;
  return [{ role: "system", content: system }, { role: "user", content: user }];
}
