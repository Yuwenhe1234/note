/**
 * [L2 Agent 调度核心层] MemoryManager - 记忆管理
 * 维护对话上下文、交互历史、用户偏好学习
 * 记忆通过 StorageDriver 持久化，跨会话留存
 */

const MemoryManager = (function () {
    const STORE_KEY = 'memory';
    const MAX_ROUNDS = 50; // 对话历史留存上限

    function _load() {
        return StorageDriver.read(STORE_KEY, {
            conversations: [],   // [{role, content, time, intent}]
            learned: {}          // 学习到的偏好：{durationAdjust: {type: factor}, ...}
        });
    }

    function _save(mem) {
        StorageDriver.write(STORE_KEY, mem);
    }

    /* ========== 对话记忆 ========== */

    /** 记录一轮对话 */
    function append(role, content, intent) {
        const mem = _load();
        mem.conversations.push({
            role,                          // 'user' | 'agent'
            content: String(content).slice(0, 500),
            intent: intent || null,
            time: Utils.nowISO()
        });
        if (mem.conversations.length > MAX_ROUNDS * 2) {
            mem.conversations = mem.conversations.slice(-MAX_ROUNDS * 2);
        }
        _save(mem);
    }

    /** 最近 n 轮对话 */
    function recent(n) {
        const mem = _load();
        return mem.conversations.slice(-(n || 10));
    }

    /** 清空对话记忆 */
    function clearConversations() {
        const mem = _load();
        mem.conversations = [];
        _save(mem);
        EventBus.emit('memory:cleared', {});
    }

    /* ========== 偏好学习 ========== */

    /**
     * 记录用户对时长预估的修正（偏好学习）
     * @param {string} type - 任务类型
     * @param {number} ratio - 实际/预估比（>1 表示用户觉得估少了）
     */
    function learnDurationAdjust(type, ratio) {
        const mem = _load();
        if (!mem.learned.durationAdjust) mem.learned.durationAdjust = {};
        // 指数平滑，逐步收敛
        const prev = mem.learned.durationAdjust[type] || 1;
        mem.learned.durationAdjust[type] = +(prev * 0.7 + ratio * 0.3).toFixed(2);
        _save(mem);
        Logger.info(`[MemoryManager] 偏好更新: ${type} 时长系数 → ${mem.learned.durationAdjust[type]}`);
    }

    /** 读取某类型任务的时长偏好系数 */
    function getDurationFactor(type) {
        const mem = _load();
        return (mem.learned.durationAdjust && mem.learned.durationAdjust[type]) || 1;
    }

    /** 全量记忆（调试面板用） */
    function snapshot() {
        return _load();
    }

    return {
        append, recent, clearConversations,
        learnDurationAdjust, getDurationFactor, snapshot
    };
})();
