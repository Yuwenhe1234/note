/**
 * [L5 基础能力层] Utils - 通用工具集
 * 日期处理 / ID 生成 / 格式化 / DOM 辅助
 */

const Utils = (function () {

    /* ========== ID 生成 ========== */
    function uid(prefix) {
        return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /* ========== 日期时间 ========== */
    /** 当前时间 ISO 字符串 */
    function nowISO() {
        return new Date().toISOString();
    }

    /** 距今天数（正数=未来，负数=过去，null=无截止） */
    function daysUntil(dateStr) {
        if (!dateStr) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return Math.ceil((d - now) / 86400000);
    }

    /** 是否已逾期（未完成 + 截止时间已过） */
    function isOverdue(task) {
        if (!task || task.status === 'completed' || !task.deadline) return false;
        return new Date(task.deadline) < new Date();
    }

    /** 截止时间距今小时数 */
    function hoursUntil(dateStr) {
        if (!dateStr) return null;
        return (new Date(dateStr) - new Date()) / 3600000;
    }

    /* ========== 格式化 ========== */
    /** 分钟 → 「X 分钟」/「X 小时 Y 分钟」 */
    function formatDuration(minutes) {
        minutes = Math.round(minutes || 0);
        if (minutes < 60) return `${minutes} 分钟`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
    }

    /** ISO/日期串 → 「X月X日 HH:MM」 */
    function formatDate(dateStr) {
        if (!dateStr) return '无截止时间';
        const d = new Date(dateStr);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
    }

    /** 今天日期描述 */
    function todayLabel() {
        const d = new Date();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`;
    }

    /* ========== 文本 ========== */
    /** HTML 转义，防注入 */
    function escape(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    /** n 天后的本地时间串（datetime-local 兼容格式） */
    function addDaysLocal(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${hh}:${mm}`;
    }

    /* ========== DOM 辅助 ========== */
    function el(id) {
        return document.getElementById(id);
    }

    /** 深拷贝（JSON 安全对象） */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    return {
        uid, nowISO, daysUntil, isOverdue, hoursUntil,
        formatDuration, formatDate, todayLabel,
        escape, addDaysLocal, el, deepClone
    };
})();
