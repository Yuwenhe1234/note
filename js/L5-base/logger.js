/**
 * [L5 基础能力层] Logger - 全局日志
 * 分级日志输出，支持日志级别开关与历史留存
 */

const Logger = (function () {
    const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
    let _level = (typeof window !== 'undefined' && window.__NOTE_DEBUG__)
        ? 'debug' : 'warn';                       // 默认仅输出 warn 以上
    const _history = [];                           // 内存留存最近 200 条
    const MAX_HISTORY = 200;

    function _log(level, args) {
        if (LEVELS[level] < LEVELS[_level]) return;
        const tag = `[${level.toUpperCase()}]`;
        const fn = (level === 'error') ? console.error
                 : (level === 'warn')  ? console.warn
                 : console.log;
        fn('%c' + tag, 'color:#888;font-weight:500;', ...args);
    }

    function _record(level, args) {
        _history.push({ time: new Date().toISOString(), level, msg: args.map(String).join(' ') });
        if (_history.length > MAX_HISTORY) _history.shift();
    }

    function debug(...args) { _record('debug', args); _log('debug', args); }
    function info(...args)  { _record('info', args);  _log('info', args); }
    function warn(...args)  { _record('warn', args);  _log('warn', args); }
    function error(...args) { _record('error', args); _log('error', args); }

    /** 设置输出级别：debug|info|warn|error|silent */
    function setLevel(level) {
        if (LEVELS[level] !== undefined) _level = level;
    }

    /** 获取内存日志历史（调试面板用） */
    function getHistory() {
        return _history.slice();
    }

    return { debug, info, warn, error, setLevel, getHistory };
})();
