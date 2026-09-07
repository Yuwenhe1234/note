/**
 * [L5 基础能力层] EventBus - 事件总线
 * 提供发布/订阅机制，实现层间解耦通信
 * 所有层级均可通过全局命名空间 EventBus 访问
 */

const EventBus = (function () {
    const _listeners = {}; // { eventName: [ {once, fn}, ... ] }

    /**
     * 订阅事件
     * @param {string} event - 事件名（如 'task:created'）
     * @param {Function} fn - 回调，接收事件载荷
     * @returns {Function} 取消订阅函数
     */
    function on(event, fn) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push({ once: false, fn });
        return () => off(event, fn);
    }

    /** 订阅一次（触发后自动移除） */
    function once(event, fn) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push({ once: true, fn });
        return () => off(event, fn);
    }

    /** 取消订阅 */
    function off(event, fn) {
        if (!_listeners[event]) return;
        _listeners[event] = _listeners[event].filter(l => l.fn !== fn);
    }

    /**
     * 发布事件
     * @param {string} event - 事件名
     * @param {*} payload - 事件载荷
     */
    function emit(event, payload) {
        Logger.debug(`[EventBus] emit "${event}"`);
        if (!_listeners[event]) return;
        // 复制数组，避免 once 移除时遍历错位
        _listeners[event].slice().forEach(listener => {
            try {
                listener.fn(payload);
            } catch (e) {
                Logger.error(`[EventBus] "${event}" 处理器异常:`, e);
            }
            if (listener.once) off(event, listener.fn);
        });
    }

    /** 查询某事件订阅数（调试用） */
    function listenerCount(event) {
        return (_listeners[event] || []).length;
    }

    return { on, once, off, emit, listenerCount };
})();
