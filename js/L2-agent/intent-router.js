/**
 * [L2 Agent 调度核心层] IntentRouter - 意图识别与路由
 * 将用户输入（结构化指令或自然语言）映射为标准意图
 * 新增意图仅需追加路由规则，无需修改路由器本身
 */

const IntentRouter = (function () {

    /**
     * 路由规则表：按序匹配，命中即返回
     * 每条规则：{ intent, patterns: [RegExp...] }
     */
    const _rules = [
        { intent: 'task.create',    patterns: [/^(新建|创建|添加|录入|新增)任务/], help: '新建任务 XXX' },
        { intent: 'task.getToday',  patterns: [/今日|今天.*(待办|任务|做什么)/],   help: '今日待办' },
        { intent: 'task.getOverdue',patterns: [/逾期|过期|超期/],                  help: '逾期任务' },
        { intent: 'task.query',     patterns: [/(查询|查看|显示|列出|展示).*(任务|清单|列表)|全部任务|^任务列表/], help: '查看任务' },
        { intent: 'stats.get',      patterns: [/统计|概览|进度总览|仪表盘|汇总/],  help: '统计概览' },
        { intent: 'task.analyze',   patterns: [/^(分析|拆解|评估)/],               help: '分析任务 XXX' },
        { intent: 'agent.help',     patterns: [/^(帮助|help|能做什么|怎么用|指令)/i], help: '帮助' },
        { intent: 'agent.architecture', patterns: [/^(架构|分层|结构|插件列表)/],  help: '架构' }
    ];

    /**
     * 识别意图
     * @param {string} input - 用户原始输入
     * @returns {{intent: string|null, confidence: 'exact'|'fuzzy', rest: string}}
     */
    function resolve(input) {
        const text = (input || '').trim();
        if (!text) return { intent: null, confidence: 'fuzzy', rest: '' };

        for (const rule of _rules) {
            for (const p of rule.patterns) {
                if (p.test(text)) {
                    return { intent: rule.intent, confidence: 'exact', rest: text };
                }
            }
        }
        // 未命中规则：若像任务描述（含动词/名词），猜测为创建意图
        return { intent: null, confidence: 'fuzzy', rest: text };
    }

    /** 追加自定义路由规则（拓展入口） */
    function addRule(rule) {
        if (rule && rule.intent && Array.isArray(rule.patterns)) {
            _rules.push(rule);
            return true;
        }
        return false;
    }

    /** 获取全部指令提示（帮助信息） */
    function helpList() {
        return _rules.filter(r => r.help).map(r => ({ intent: r.intent, help: r.help }));
    }

    return { resolve, addRule, helpList };
})();
