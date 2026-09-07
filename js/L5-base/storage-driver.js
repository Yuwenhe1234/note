/**
 * [L5 基础能力层] StorageDriver - 存储驱动
 * localStorage 底层封装：读写 / 命名空间 / 错误兜底
 * 上层仓储（L4）只依赖本驱动，未来可无缝替换为 IndexedDB / 远程 API
 */

const StorageDriver = (function () {

    const _prefix = 'note_'; // 命名空间前缀，避免与其他应用冲突

    function _key(key) {
        return _prefix + key;
    }

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(_key(key));
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            Logger.error('[StorageDriver] 读取失败:', key, e);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(_key(key), JSON.stringify(value));
            return true;
        } catch (e) {
            Logger.error('[StorageDriver] 写入失败:', key, e);
            return false;
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(_key(key));
            return true;
        } catch (e) {
            Logger.error('[StorageDriver] 删除失败:', key, e);
            return false;
        }
    }

    /** 枚举本应用全部存储键（调试/导出用） */
    function keys() {
        const result = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(_prefix)) result.push(k.slice(_prefix.length));
        }
        return result;
    }

    return { read, write, remove, keys };
})();
