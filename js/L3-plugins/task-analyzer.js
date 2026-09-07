/**
 * [L3 能力插件层] TaskAnalyzerPlugin - 任务分析与时长智能分配
 * 意图：task.analyze
 * 能力：任务类型识别 / 3-5 级子任务拆解 / 时长智能分配 / 优先级判定
 */

class TaskAnalyzerPlugin extends BasePlugin {
    constructor() {
        super({
            name: 'task-analyzer',
            version: '1.0.0',
            description: '任务智能拆解与时长分配',
            intents: ['task.analyze']
        });
    }

    /* ===== 关键词词典 ===== */
    static KEYWORDS = {
        study: ['学习', '复习', '考试', '课程', '教程', '阅读', '理解', '掌握', '研究', '论文', '自学', '备考', '知识', '概念', '原理', '刷题'],
        work: ['报告', '方案', '会议', '项目', '周报', '月报', '汇报', '邮件', '文档', '需求', '评审', '交付', '客户', '合同', '预算', '总结', '述职'],
        practical: ['搭建', '开发', '实现', '部署', '编码', '安装', '配置', '测试', '调试', '制作', '构建', '重构', '优化', '迁移', '上线'],
        daily: ['运动', '打扫', '买菜', '做饭', '取快递', '约会', '聚餐', '锻炼', '休息', '体检', '出行', '洗衣', '购物', '跑步', '健身']
    };

    static COMPLEXITY_HIGH = ['系统', '大型', '复杂', '全面', '完整', '深入', '精通', '重构', '架构', '从零', '端到端'];
    static COMPLEXITY_LOW = ['简单', '快速', '基本', '初步', '粗略'];

    static SUBTASK_TEMPLATES = {
        study: [
            { name: '阅读核心资料，建立知识框架', base: 30 },
            { name: '深入理解核心概念与原理', base: 45 },
            { name: '动手练习或做笔记巩固', base: 40 },
            { name: '总结回顾，查漏补缺', base: 20 }
        ],
        work: [
            { name: '收集整理所需信息与素材', base: 25 },
            { name: '梳理内容框架与要点', base: 30 },
            { name: '撰写/制作主体内容', base: 45 },
            { name: '审核修改与格式校对', base: 20 },
            { name: '提交/发送/汇报', base: 10 }
        ],
        practical: [
            { name: '环境准备与依赖安装', base: 25 },
            { name: '核心功能开发/实现', base: 60 },
            { name: '测试验证与问题排查', base: 30 },
            { name: '优化完善与收尾', base: 20 }
        ],
        daily: [
            { name: '准备阶段', base: 5 },
            { name: '执行主体', base: 20 },
            { name: '收尾整理', base: 5 }
        ],
        custom: [
            { name: '明确目标与拆解要点', base: 15 },
            { name: '执行核心步骤', base: 40 },
            { name: '检查与完善', base: 15 }
        ]
    };

    execute(payload) {
        const { title, description = '', type, priority, deadline } = payload;
        const settings = UserRepository.get();
        const text = `${title} ${description}`.toLowerCase();

        // 1. 类型识别（用户显式指定 > 关键词识别）
        const finalType = (type && type !== 'auto') ? type : this._detectType(text);

        // 2. 子任务拆解 + 时长分配
        const subtasks = this._buildSubtasks(finalType, text, settings);

        // 3. 优先级判定
        const finalPriority = (priority && priority !== 'auto')
            ? priority : this._detectPriority(deadline, text);

        // 4. 汇总总时长
        const totalDuration = subtasks.reduce((s, x) => s + x.duration, 0);

        Logger.debug(`[task-analyzer] 类型=${finalType} 优先级=${finalPriority} 时长=${totalDuration}分钟`);

        return {
            title, description,
            type: finalType,
            priority: finalPriority,
            deadline: deadline || '',
            total_duration: totalDuration,
            subtasks
        };
    }

    /* ===== 类型识别 ===== */
    _detectType(text) {
        let best = 'custom', bestScore = 0;
        Object.entries(TaskAnalyzerPlugin.KEYWORDS).forEach(([type, kws]) => {
            const score = kws.filter(kw => text.includes(kw)).length;
            if (score > bestScore) { bestScore = score; best = type; }
        });
        return bestScore > 0 ? best : 'custom';
    }

    /* ===== 子任务生成 ===== */
    _buildSubtasks(type, text, settings) {
        const templates = TaskAnalyzerPlugin.SUBTASK_TEMPLATES[type] || TaskAnalyzerPlugin.SUBTASK_TEMPLATES.custom;

        // 复杂度系数
        let complexity = 1;
        let count = templates.length;
        if (TaskAnalyzerPlugin.COMPLEXITY_HIGH.some(k => text.includes(k))) {
            complexity = 1.4; count = Math.min(count, 5);
        } else if (TaskAnalyzerPlugin.COMPLEXITY_LOW.some(k => text.includes(k))) {
            complexity = 0.7; count = Math.max(count - 1, 3);
        }

        // 用户偏好系数（L4 偏好数据驱动）
        const pace = { slow: 1.3, medium: 1.0, fast: 0.75 }[settings.pace] || 1.0;
        const prof = { beginner: 1.3, medium: 1.0, expert: 0.7 }[settings.proficiency] || 1.0;
        const mult = complexity * pace * prof;

        return templates.slice(0, count).map((tpl, i) => ({
            name: tpl.name,
            duration: Math.max(5, Math.round(tpl.base * mult / 5) * 5),
            order: i + 1,
            dependencies: i > 0 ? [i] : [],
            done: false
        }));
    }

    /* ===== 优先级判定 ===== */
    _detectPriority(deadline, text) {
        if (!deadline) return 'medium';
        const hours = Utils.hoursUntil(deadline);
        if (hours <= 24) return 'high';
        if (hours <= 72) return 'medium';

        const importantKws = ['重要', '关键', '核心', '必须', '紧急'];
        const isImportant = importantKws.some(k => text.includes(k));
        if (isImportant && hours <= 168) return 'medium';
        return isImportant ? 'medium' : 'low';
    }
}
