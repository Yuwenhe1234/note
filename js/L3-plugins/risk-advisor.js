/**
 * [L3 能力插件层] RiskAdvisorPlugin - 风险预警
 * 意图：task.risk
 * 能力：按任务类型生成针对性风险提示 + 应对方案；截止时间紧迫时追加时间风险
 */

class RiskAdvisorPlugin extends BasePlugin {
    constructor() {
        super({
            name: 'risk-advisor',
            version: '1.0.0',
            description: '执行风险预警与应对方案',
            intents: ['task.risk']
        });
    }

    static TEMPLATES = {
        study: [
            { problem: '只看不练导致知识留存率低', solution: '学完每个概念立即动手练习，用费曼技巧复述检验' },
            { problem: '学习材料过多导致选择困难', solution: '先选 1 份主线教程跟到底，其他作为补充' },
            { problem: '遗忘曲线导致学完就忘', solution: '按 1/3/7/15 天间隔复习，核心知识做笔记' }
        ],
        work: [
            { problem: '信息收集不完整导致返工', solution: '动手前先列清单，确认所需信息和数据来源' },
            { problem: '截止时间紧迫来不及审核', solution: '预留 20% 缓冲时间用于审核和修改' },
            { problem: '多人协作沟通不同步', solution: '提前约定沟通节奏与反馈格式，关键节点同步进度' }
        ],
        practical: [
            { problem: '环境/依赖问题导致卡在起步', solution: '先跑通最小 Demo 验证环境，再逐步扩展' },
            { problem: '中途遇到技术瓶颈影响进度', solution: '每个子任务设时间上限，超时果断求助或换方案' },
            { problem: '交付时发现遗漏关键功能', solution: '开发前先列功能清单，完成后逐项验收' }
        ],
        daily: [
            { problem: '计划被突发事件打乱', solution: '核心事项排在上午优先完成，留弹性时间' },
            { problem: '难以坚持形成习惯', solution: '降低初始门槛，绑定已有习惯触发，追踪打卡' }
        ],
        custom: [
            { problem: '目标不清晰导致执行偏离', solution: '先明确可量化的完成标准，再开始执行' },
            { problem: '低估所需时间和精力', solution: '预估时间基础上增加 30% 缓冲，分阶段检查进度' }
        ]
    };

    execute(payload) {
        const { type, deadline, title = '', description = '' } = payload;
        const templates = RiskAdvisorPlugin.TEMPLATES[type] || RiskAdvisorPlugin.TEMPLATES.custom;
        const risks = [...templates];

        // 截止时间紧迫 → 追加时间风险置顶
        if (deadline) {
            const hours = Utils.hoursUntil(deadline);
            if (hours > 0 && hours <= 48) {
                risks.unshift({
                    problem: `截止时间仅剩 ${Math.round(hours)} 小时，时间紧张`,
                    solution: '优先完成核心子任务，非关键步骤可后置或简化'
                });
            }
        }

        // 标题含「重要/紧急」→ 追加质量风险
        const text = `${title} ${description}`.toLowerCase();
        if (['重要', '紧急', '关键'].some(k => text.includes(k))) {
            risks.push({
                problem: '高重要度任务容错率低',
                solution: '完成后预留复核时间，关键节点请他人交叉检查'
            });
        }

        return risks.slice(0, 4);
    }
}
