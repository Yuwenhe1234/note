/**
 * [L4 数据持久层] Schema - 统一数据范式
 * 定义 TaskObject 标准结构：基础核心字段（不可变）+ 功能模块字段（按需）+ 永久预留拓展字段
 * 新增功能仅拓展字段或写入扩展容器，不改动基础核心字段，保证 100% 向下兼容
 */

const Schema = (function () {

    /* ========== 枚举定义 ========== */
    const TASK_TYPES = ['study', 'work', 'practical', 'daily', 'custom'];
    const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'delayed'];
    const TASK_PRIORITIES = ['high', 'medium', 'low'];

    const TYPE_LABELS = {
        study: '学习类', work: '工作事务类', practical: '技能实操类',
        daily: '日常事务类', custom: '自定义类'
    };

    const STATUS_LABELS = {
        pending: '未开始', in_progress: '进行中',
        completed: '已完成', delayed: '延期'
    };

    const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' };

    /* ========== TaskObject 范式 ========== */
    const CORE_FIELDS = [
        'task_id',    // 字符串，任务唯一标识
        'title',      // 字符串，任务标题
        'type',       // 枚举，任务类型
        'status',     // 枚举，任务状态
        'priority',   // 枚举，优先级
        'deadline',   // 日期时间，截止时间
        'total_duration' // 数字，总预估时长（分钟）
    ];

    const MODULE_FIELDS = [
        'subtasks',           // 数组：{name, duration, order, dependencies, done}
        'learning_support',   // 对象：{video_recommendations[], core_notes}
        'risk_reminder',      // 数组：{problem, solution}
        'description'         // 字符串，任务描述
    ];

    const EXTENSION_FIELDS = [
        'custom_tags',        // 数组，用户自定义标签
        'progress',           // 数字，任务进度百分比
        'review_records',     // 数组，复盘记录列表
        'extended_fields'     // 对象，完全自定义拓展容器（新属性一律写这里）
    ];

    /**
     * 规范化任务对象：补全缺失字段、修正非法枚举值
     * 保证从旧版本存储或导入数据进入系统时始终符合范式
     * @param {Object} raw - 原始任务数据
     * @returns {Object} 规范化后的 TaskObject
     */
    function normalizeTask(raw) {
        raw = raw || {};
        return {
            // —— 基础核心字段 ——
            task_id: raw.task_id || Utils.uid('task'),
            title: String(raw.title || '未命名任务'),
            type: TASK_TYPES.includes(raw.type) ? raw.type : 'custom',
            status: TASK_STATUSES.includes(raw.status) ? raw.status : 'pending',
            priority: TASK_PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
            deadline: raw.deadline || '',
            total_duration: Number(raw.total_duration) || 0,
            created_at: raw.created_at || Utils.nowISO(),
            updated_at: raw.updated_at || Utils.nowISO(),

            // —— 功能模块字段 ——
            subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map(normalizeSubtask) : [],
            learning_support: raw.learning_support ? {
                video_recommendations: Array.isArray(raw.learning_support.video_recommendations)
                    ? raw.learning_support.video_recommendations : [],
                core_notes: String(raw.learning_support.core_notes || '')
            } : null,
            risk_reminder: Array.isArray(raw.risk_reminder)
                ? raw.risk_reminder.filter(r => r && r.problem) : [],
            description: String(raw.description || ''),

            // —— 永久预留拓展字段 ——
            custom_tags: Array.isArray(raw.custom_tags) ? raw.custom_tags : [],
            progress: Number(raw.progress) || 0,
            review_records: Array.isArray(raw.review_records) ? raw.review_records : [],
            extended_fields: (raw.extended_fields && typeof raw.extended_fields === 'object')
                ? raw.extended_fields : {}
        };
    }

    function normalizeSubtask(s) {
        s = s || {};
        return {
            name: String(s.name || '子任务'),
            duration: Number(s.duration) || 15,
            order: Number(s.order) || 1,
            dependencies: Array.isArray(s.dependencies) ? s.dependencies : [],
            done: !!s.done
        };
    }

    /**
     * 校验任务对象合法性（创建/导入时使用）
     * @returns {{valid: boolean, errors: string[]}}
     */
    function validateTask(task) {
        const errors = [];
        if (!task.title || !task.title.trim()) errors.push('标题不能为空');
        if (!TASK_TYPES.includes(task.type)) errors.push(`非法任务类型: ${task.type}`);
        if (!TASK_STATUSES.includes(task.status)) errors.push(`非法状态: ${task.status}`);
        if (!TASK_PRIORITIES.includes(task.priority)) errors.push(`非法优先级: ${task.priority}`);
        if (task.total_duration < 0) errors.push('总时长不能为负');
        return { valid: errors.length === 0, errors };
    }

    return {
        TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES,
        TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS,
        CORE_FIELDS, MODULE_FIELDS, EXTENSION_FIELDS,
        normalizeTask, validateTask
    };
})();
