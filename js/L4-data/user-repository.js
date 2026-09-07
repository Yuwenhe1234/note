/**
 * [L4 数据持久层] UserRepository - 用户偏好仓储
 * 存储用户执行节奏、熟练度等个人偏好，供插件层动态适配
 */

const UserRepository = (function () {
    const STORE_KEY = 'settings';

    const DEFAULTS = {
        pace: 'medium',          // slow | medium | fast — 执行节奏
        proficiency: 'medium',   // beginner | medium | expert — 熟练程度
        reminders: true          // 是否开启提醒
    };

    function get() {
        return { ...DEFAULTS, ...StorageDriver.read(STORE_KEY, {}) };
    }

    function save(updates) {
        const merged = { ...get(), ...updates };
        StorageDriver.write(STORE_KEY, merged);
        EventBus.emit('user:settings-updated', merged);
        return merged;
    }

    return { get, save, DEFAULTS };
})();
