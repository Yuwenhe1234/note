/**
 * [L3 能力插件层] BasePlugin - 插件基类
 * 所有能力插件的统一接口契约
 *
 * 新增能力三步走：
 *   1. 继承 BasePlugin 实现新插件
 *   2. 在插件入口调用 Agent.registerPlugin(new XxxPlugin())
 *   3. 完成 —— 意图路由自动分发，原有插件零改动
 *
 * 插件通过 this.registry / this.deps 访问调度核心与基础能力，
 * 严禁直接引用其他插件（保证完全解耦、可独立插拔）
 */

class BasePlugin {
    /**
     * @param {Object} config
     * @param {string} config.name        - 插件唯一标识（如 'task-analyzer'）
     * @param {string} config.version     - 插件版本
     * @param {string} config.description - 插件描述
     * @param {string[]} config.intents   - 声明可处理的意图列表（路由依据）
     */
    constructor(config) {
        this.name = config.name;
        this.version = config.version || '1.0.0';
        this.description = config.description || '';
        this.intents = config.intents || [];
        this.registry = null;   // 由 PluginRegistry 注入
        this.enabled = true;
    }

    /**
     * 插件初始化钩子（注册后由调度核心调用，可选实现）
     */
    onRegister() {}

    /**
     * 执行插件能力（子类必须实现）
     * @param {Object} payload - 意图载荷
     * @param {string} intent  - 命中的意图
     * @returns {*} 处理结果
     */
    execute(payload, intent) {
        throw new Error(`插件 "${this.name}" 未实现 execute()`);
    }

    /** 是否可处理某意图 */
    canHandle(intent) {
        return this.enabled && this.intents.includes(intent);
    }
}
