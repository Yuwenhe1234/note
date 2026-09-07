/**
 * [L4 数据持久层] TaskRepository - 任务仓储
 * 基于 StorageDriver 提供任务 CRUD / 查询筛选 / 统计
 * 所有写入均经 Schema.normalizeTask 规范化，保证数据范式统一
 * 数据变更通过 EventBus 广播，上层视图自行订阅刷新
 */

const TaskRepository = (function () {
    const STORE_KEY = 'tasks';

    /* ========== 内部 ========== */
    function _all() {
        return StorageDriver.read(STORE_KEY, []).map(Schema.normalizeTask);
    }

    function _save(tasks) {
        return StorageDriver.write(STORE_KEY, tasks);
    }

    /* ========== CRUD ========== */

    function getAll() {
        return _all();
    }

    function getById(id) {
        return _all().find(t => t.task_id === id) || null;
    }

    /** 创建任务（自动规范化 + 广播事件） */
    function create(data) {
        const tasks = _all();
        const task = Schema.normalizeTask(data);
        tasks.push(task);
        _save(tasks);
        EventBus.emit('task:created', task);
        return task;
    }

    /** 更新任务（合并字段，task_id 不可覆盖） */
    function update(id, updates) {
        const tasks = _all();
        const idx = tasks.findIndex(t => t.task_id === id);
        if (idx === -1) return null;

        tasks[idx] = Schema.normalizeTask({
            ...tasks[idx],
            ...updates,
            task_id: id,
            updated_at: Utils.nowISO()
        });
        _save(tasks);
        EventBus.emit('task:updated', tasks[idx]);
        return tasks[idx];
    }

    /** 删除任务 */
    function remove(id) {
        const tasks = _all();
        const filtered = tasks.filter(t => t.task_id !== id);
        if (filtered.length === tasks.length) return false;
        _save(filtered);
        EventBus.emit('task:deleted', { task_id: id });
        return true;
    }

    /* ========== 子任务与状态 ========== */

    /** 切换子任务完成态，联动进度与状态 */
    function toggleSubtask(taskId, subtaskIndex) {
        const task = getById(taskId);
        if (!task || !task.subtasks[subtaskIndex]) return null;

        task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
        const done = task.subtasks.filter(s => s.done).length;
        const progress = Math.round((done / task.subtasks.length) * 100);

        return update(taskId, {
            subtasks: task.subtasks,
            progress,
            status: progress === 0 ? 'pending' : (progress === 100 ? 'completed' : 'in_progress')
        });
    }

    /** 直接更新任务状态 */
    function updateStatus(taskId, status) {
        const updates = { status };
        if (status === 'completed') updates.progress = 100;
        if (status === 'pending') updates.progress = 0;
        return update(taskId, updates);
    }

    /* ========== 查询 ========== */

    /**
     * 条件查询 + 排序
     * @param {Object} filters - {type, status, priority, search}
     * @param {string} sortBy - deadline | priority | created | title
     */
    function query(filters, sortBy) {
        filters = filters || {};
        let tasks = _all();

        if (filters.type) tasks = tasks.filter(t => t.type === filters.type);
        if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
        if (filters.priority) tasks = tasks.filter(t => t.priority === filters.priority);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q)
            );
        }

        const pw = { high: 3, medium: 2, low: 1 };
        tasks.sort((a, b) => {
            switch (sortBy) {
                case 'priority': return pw[b.priority] - pw[a.priority];
                case 'created':  return new Date(b.created_at) - new Date(a.created_at);
                case 'title':    return a.title.localeCompare(b.title, 'zh');
                default:
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
            }
        });
        return tasks;
    }

    /** 今日待办（未完成 + 截止日在今天） */
    function getToday() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 86400000);
        return _all().filter(t => {
            if (t.status === 'completed' || !t.deadline) return false;
            const d = new Date(t.deadline);
            return d >= today && d < tomorrow;
        });
    }

    /** 逾期任务 */
    function getOverdue() {
        return _all().filter(Utils.isOverdue);
    }

    /* ========== 统计 ========== */

    function getStats() {
        const tasks = _all();
        const stats = {
            total: tasks.length,
            pending: 0, in_progress: 0, completed: 0, delayed: 0,
            overdue: 0,
            byPriority: { high: 0, medium: 0, low: 0 },
            byType: { study: 0, work: 0, practical: 0, daily: 0, custom: 0 },
            totalDuration: 0
        };

        tasks.forEach(t => {
            if (stats[t.status] !== undefined) stats[t.status]++;
            if (stats.byPriority[t.priority] !== undefined) stats.byPriority[t.priority]++;
            if (stats.byType[t.type] !== undefined) stats.byType[t.type]++;
            stats.totalDuration += t.total_duration;
            if (Utils.isOverdue(t)) stats.overdue++;
        });
        return stats;
    }

    /* ========== 数据管理 ========== */

    function exportAll() {
        return { version: '2.0', exported_at: Utils.nowISO(), tasks: _all() };
    }

    function importAll(data) {
        if (!data || !Array.isArray(data.tasks)) return false;
        _save(data.tasks.map(Schema.normalizeTask));
        EventBus.emit('data:imported', {});
        return true;
    }

    function clearAll() {
        _save([]);
        EventBus.emit('data:cleared', {});
    }

    /** 预置示例数据（仅空库时） */
    function seedIfEmpty() {
        if (_all().length > 0) return false;

        const samples = [
            {
                title: '学习 React Hooks 核心概念', type: 'study', status: 'in_progress',
                priority: 'high', deadline: Utils.addDaysLocal(3), total_duration: 180,
                description: '系统学习 useState、useEffect、useMemo 等核心 Hooks 的使用场景和原理',
                subtasks: [
                    { name: '阅读官方文档 Hooks 章节', duration: 30, order: 1, dependencies: [], done: true },
                    { name: '观看 Hooks 实战视频教程', duration: 60, order: 2, dependencies: [1], done: false },
                    { name: '动手实现 3 个常用 Hooks 示例', duration: 60, order: 3, dependencies: [2], done: false },
                    { name: '总结 Hooks 最佳实践笔记', duration: 30, order: 4, dependencies: [3], done: false }
                ],
                learning_support: {
                    video_recommendations: [
                        { position: '入门讲解', direction: 'React 官方 Hooks 介绍', content: 'useState/useEffect 基础用法与核心原理' },
                        { position: '实操教程', direction: 'React Hooks 实战项目', content: '自定义 Hooks 封装、性能优化实战' },
                        { position: '进阶提升', direction: '深入 React Hooks 源码', content: '闭包陷阱、并发模式下的 Hooks 行为' }
                    ],
                    core_notes: '核心概念：useState 管状态、useEffect 管副作用、useMemo 缓存计算\n关键步骤：1.定义状态 2.编写副作用 3.性能优化 4.抽取自定义 Hook\n避坑提示：1.依赖数组要写全 2.避免在循环/条件中调用 Hook 3.cleanup 别忘了写'
                },
                risk_reminder: [
                    { problem: 'useEffect 依赖数组遗漏导致闭包陷阱', solution: '使用 eslint 插件自动检测，或改用 ref 获取最新值' },
                    { problem: '过度使用 useMemo 反而降低性能', solution: '仅在昂贵计算或频繁渲染场景使用' }
                ]
            },
            {
                title: '完成季度项目周报撰写', type: 'work', status: 'pending',
                priority: 'medium', deadline: Utils.addDaysLocal(1), total_duration: 90,
                description: '整理本季度项目进展、里程碑完成情况、风险评估，形成周报文档',
                subtasks: [
                    { name: '收集各模块进度数据', duration: 20, order: 1, dependencies: [], done: false },
                    { name: '撰写里程碑完成情况', duration: 30, order: 2, dependencies: [1], done: false },
                    { name: '梳理风险与下周计划', duration: 20, order: 3, dependencies: [2], done: false },
                    { name: '排版校对并提交', duration: 20, order: 4, dependencies: [3], done: false }
                ],
                risk_reminder: [
                    { problem: '数据收集不完整导致报告失真', solution: '提前一天发模板给各模块负责人' },
                    { problem: '排版格式不统一需反复修改', solution: '使用统一模板，先定格式再填内容' }
                ]
            },
            {
                title: '搭建个人博客网站', type: 'practical', status: 'pending',
                priority: 'medium', deadline: Utils.addDaysLocal(7), total_duration: 240,
                description: '使用 Next.js + Tailwind CSS 搭建个人技术博客，支持 Markdown 文章与暗色模式',
                subtasks: [
                    { name: '初始化项目并配置开发环境', duration: 30, order: 1, dependencies: [], done: false },
                    { name: '搭建页面布局与路由结构', duration: 60, order: 2, dependencies: [1], done: false },
                    { name: '实现 Markdown 渲染与标签系统', duration: 90, order: 3, dependencies: [2], done: false },
                    { name: '添加暗色模式与响应式适配', duration: 30, order: 4, dependencies: [3], done: false },
                    { name: '部署上线并测试', duration: 30, order: 5, dependencies: [4], done: false }
                ],
                learning_support: {
                    video_recommendations: [
                        { position: '入门讲解', direction: 'Next.js 官方教程', content: 'App Router 路由系统、服务端组件基础' },
                        { position: '实操教程', direction: '全栈博客搭建实战', content: 'MDX 集成、主题定制、部署流程' }
                    ],
                    core_notes: '核心概念：文件即路由、Server/Client 组件区分、原子化样式\n关键步骤：1.路由搭建 2.组件开发 3.内容管理 4.部署上线\n避坑提示：1."use client" 别乱加 2.图片用 next/image 3.动态路由注意静态参数生成'
                },
                risk_reminder: [
                    { problem: '版本更新导致 API 变化', solution: '锁定文档对应版本，关注迁移指南' },
                    { problem: '部署时环境变量配置遗漏', solution: '本地 .env.local 测试，部署前检查平台配置' }
                ]
            },
            {
                title: '每日 30 分钟运动计划', type: 'daily', status: 'in_progress',
                priority: 'low', deadline: '', total_duration: 30,
                description: '保持每日运动习惯，交替进行跑步、力量训练、拉伸放松',
                subtasks: [
                    { name: '热身 5 分钟', duration: 5, order: 1, dependencies: [], done: false },
                    { name: '主运动 20 分钟', duration: 20, order: 2, dependencies: [1], done: false },
                    { name: '拉伸放松 5 分钟', duration: 5, order: 3, dependencies: [2], done: false }
                ],
                risk_reminder: [
                    { problem: '强度突然增大容易受伤', solution: '循序渐进，每周增量不超过 10%' },
                    { problem: '天气不好时容易中断', solution: '准备室内替代方案' }
                ]
            }
        ];

        samples.forEach(s => create(s));
        return true;
    }

    return {
        getAll, getById, create, update, remove,
        toggleSubtask, updateStatus,
        query, getToday, getOverdue, getStats,
        exportAll, importAll, clearAll, seedIfEmpty
    };
})();
