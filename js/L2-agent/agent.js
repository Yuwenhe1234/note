/**
 * [L2 Agent 调度核心层] Agent - 调度核心编排器
 * 大脑中枢：意图识别 → 插件路由 → 流程编排 → 记忆管理
 * 上层（L1）仅与本模块交互，不直接触碰插件与数据层
 */

const Agent = (function () {

    let _initialized = false;

    /* ========== 初始化 ========== */

    function init() {
        if (_initialized) return;
        _initialized = true;

        // 注册默认能力插件（L3）
        PluginRegistry.register(new TaskAnalyzerPlugin());
        PluginRegistry.register(new LearningAssistantPlugin());
        PluginRegistry.register(new RiskAdvisorPlugin());
        PluginRegistry.register(new TaskManagerPlugin());
        PluginRegistry.register(new StatsPlugin());

        // 首次使用播种示例数据
        TaskRepository.seedIfEmpty();

        Logger.info('[Agent] 调度核心初始化完成，已注册插件:', PluginRegistry.list().map(p => p.name).join(', '));
        EventBus.emit('agent:ready', {});
    }

    /* ========== 插件管理（透传给 PluginRegistry） ========== */

    function registerPlugin(plugin) {
        return PluginRegistry.register(plugin);
    }

    function unregisterPlugin(name) {
        return PluginRegistry.unregister(name);
    }

    function listPlugins() {
        return PluginRegistry.list();
    }

    /* ========== 意图分发 ========== */

    /**
     * 分发意图到对应插件执行
     * @param {string} intent - 标准意图（如 'task.query'）
     * @param {Object} payload - 意图载荷
     * @returns {*} 插件执行结果（插件不存在返回 null）
     */
    function dispatch(intent, payload) {
        const plugin = PluginRegistry.findByIntent(intent);
        if (!plugin) {
            Logger.warn(`[Agent] 无插件可处理意图: ${intent}`);
            return null;
        }
        Logger.debug(`[Agent] 意图 "${intent}" → 插件 "${plugin.name}"`);
        try {
            return plugin.execute(payload || {}, intent);
        } catch (e) {
            Logger.error(`[Agent] 插件 "${plugin.name}" 执行异常:`, e);
            return null;
        }
    }

    /* ========== 复合流程编排 ========== */

    /**
     * 全流程任务分析：拆解 → 时长 → 优先级 → 学习辅助 → 风险预警
     * 一次编排多个插件，产出符合 TaskObject 范式的完整任务草稿
     */
    function analyzeTaskFull(input) {
        // 插件1：任务分析与时长分配
        const analysis = dispatch('task.analyze', input);
        if (!analysis) return null;

        // 学习类/实操类 → 插件2：学习辅助
        let learningSupport = null;
        if (analysis.type === 'study' || analysis.type === 'practical') {
            learningSupport = dispatch('task.learning', {
                title: input.title,
                description: input.description
            });
        }

        // 插件3：风险预警
        const risks = dispatch('task.risk', {
            type: analysis.type,
            deadline: input.deadline,
            title: input.title,
            description: input.description
        });

        // 应用记忆层学到的时长偏好
        const factor = MemoryManager.getDurationFactor(analysis.type);
        if (factor !== 1) {
            analysis.subtasks.forEach(s => {
                s.duration = Math.max(5, Math.round(s.duration * factor / 5) * 5);
            });
            analysis.total_duration = analysis.subtasks.reduce((sum, s) => sum + s.duration, 0);
        }

        return {
            title: analysis.title,
            description: analysis.description,
            type: analysis.type,
            priority: analysis.priority,
            deadline: analysis.deadline,
            total_duration: analysis.total_duration,
            subtasks: analysis.subtasks,
            learning_support: learningSupport,
            risk_reminder: risks || [],
            custom_tags: [],
            progress: 0,
            review_records: [],
            extended_fields: {}
        };
    }

    /* ========== 自然语言入口（对话模式） ========== */

    /**
     * 处理用户自然语言输入（L1 对话入口调用）
     * @returns {{reply: string, data?: *, intent: string}}
     */
    function handleInput(text) {
        MemoryManager.append('user', text);
        const { intent } = IntentRouter.resolve(text);
        let result = { reply: '', intent: intent || 'agent.fallback' };

        if (intent === 'task.getToday') {
            const overdue = dispatch('task.getOverdue', {}) || [];
            const today = dispatch('task.getToday', {}) || [];
            const all = [...overdue, ...today];
            result.data = all;
            result.reply = all.length === 0
                ? '今天没有待办任务，休息一下吧！'
                : `今天共有 ${all.length} 项待办（含逾期 ${overdue.length} 项）：\n` +
                  all.map((t, i) => `${i + 1}. ${t.title}（${Schema.PRIORITY_LABELS[t.priority]}优先级 · ${Utils.formatDuration(t.total_duration)}）`).join('\n');
        }
        else if (intent === 'task.query') {
            const tasks = dispatch('task.query', {}) || [];
            result.data = tasks;
            result.reply = tasks.length === 0
                ? '当前没有任务，可对我说「新建任务 XXX」'
                : `共 ${tasks.length} 项任务：\n` +
                  tasks.map((t, i) => `${i + 1}. ${t.title}（${Schema.STATUS_LABELS[t.status]}）`).join('\n');
        }
        else if (intent === 'stats.get') {
            const stats = dispatch('stats.get', {});
            result.data = stats;
            result.reply = stats.total === 0
                ? '暂无任务数据'
                : `任务统计：共 ${stats.total} 项\n· 进行中 ${stats.in_progress} · 已完成 ${stats.completed} · 逾期 ${stats.overdue}\n· 高优先级 ${stats.byPriority.high} · 中 ${stats.byPriority.medium} · 低 ${stats.byPriority.low}\n累计预估时长 ${Utils.formatDuration(stats.totalDuration)}`;
        }
        else if (intent === 'agent.help') {
            result.reply = '可用指令：\n· 新建任务 XXX\n· 今日待办\n· 查看任务\n· 统计概览\n· 架构\n也可以直接在任务清单页使用完整功能。';
        }
        else if (intent === 'agent.architecture') {
            const plugins = listPlugins();
            result.data = plugins;
            result.reply = `当前五层架构已加载，注册插件 ${plugins.length} 个：\n` +
                           plugins.map(p => `· ${p.name} v${p.version} — ${p.description}`).join('\n');
        }
        else if (intent === 'task.analyze') {
            const title = text.replace(/^(分析|拆解|评估)/, '').trim();
            if (!title) {
                result.reply = '请提供任务标题，例如「分析任务 学习 React 基础」';
            } else {
                const draft = analyzeTaskFull({ title });
                result.data = draft;
                result.reply = `「${draft.title}」分析完成：\n· 类型：${Schema.TYPE_LABELS[draft.type]}\n· 总时长：${Utils.formatDuration(draft.total_duration)}\n· 子任务 ${draft.subtasks.length} 项\n如需保存，请到任务清单页点击「新建任务」。`;
            }
        }
        else if (intent === 'task.create') {
            const title = text.replace(/^(新建|创建|添加|录入|新增)任务/, '').trim();
            result.data = { draftTitle: title };
            result.reply = `收到「${title || '新任务'}」。请到任务清单页点击「新建任务」，填入标题后点击「智能分析」，系统将自动完成拆解、时长分配${''}与风险预警。`;
        }
        else {
            // 兜底：猜测为创建任务意图
            result.data = { draftTitle: text };
            result.reply = `我不太确定您的意图。如果是想创建任务「${text.slice(0, 20)}」，请说「新建任务 ${text.slice(0, 20)}」；或输入「帮助」查看全部指令。`;
        }

        MemoryManager.append('agent', result.reply, intent);
        EventBus.emit('agent:replied', result);
        return result;
    }

    return {
        init, dispatch, handleInput, analyzeTaskFull,
        registerPlugin, unregisterPlugin, listPlugins
    };
})();
