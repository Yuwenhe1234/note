/**
 * [L2 Agent 调度核心层] PluginRegistry - 插件注册中心
 * 管理插件全生命周期：注册 / 注销 / 启停 / 按意图检索
 * 新增能力 = 新增插件注册，调度逻辑零改动
 */

const PluginRegistry = (function () {
    const _plugins = new Map(); // name → plugin 实例

    /**
     * 注册插件
     * @param {BasePlugin} plugin - 插件实例
     */
    function register(plugin) {
        if (!plugin || !plugin.name) {
            Logger.error('[PluginRegistry] 无效插件：缺少 name');
            return false;
        }
        if (_plugins.has(plugin.name)) {
            Logger.warn(`[PluginRegistry] 插件 "${plugin.name}" 已存在，将被覆盖`);
        }

        plugin.registry = PluginRegistry; // 注入反向引用
        _plugins.set(plugin.name, plugin);

        if (typeof plugin.onRegister === 'function') {
            try { plugin.onRegister(); } catch (e) { Logger.error(`[PluginRegistry] ${plugin.name} 初始化异常:`, e); }
        }

        Logger.info(`[PluginRegistry] 插件已注册: ${plugin.name} v${plugin.version} (意图: ${plugin.intents.join(', ') || '无'})`);
        EventBus.emit('plugin:registered', { name: plugin.name });
        return true;
    }

    /** 注销插件 */
    function unregister(name) {
        if (!_plugins.has(name)) return false;
        _plugins.delete(name);
        Logger.info(`[PluginRegistry] 插件已注销: ${name}`);
        EventBus.emit('plugin:unregistered', { name });
        return true;
    }

    /** 按意图查找可用插件（先注册者优先） */
    function findByIntent(intent) {
        for (const plugin of _plugins.values()) {
            if (plugin.canHandle(intent)) return plugin;
        }
        return null;
    }

    /** 按名称获取 */
    function get(name) {
        return _plugins.get(name) || null;
    }

    /** 全部插件清单（架构面板展示用） */
    function list() {
        return Array.from(_plugins.values()).map(p => ({
            name: p.name,
            version: p.version,
            description: p.description,
            intents: [...p.intents],
            enabled: p.enabled
        }));
    }

    /** 启用/停用插件 */
    function setEnabled(name, enabled) {
        const p = _plugins.get(name);
        if (!p) return false;
        p.enabled = !!enabled;
        EventBus.emit('plugin:toggled', { name, enabled: p.enabled });
        return true;
    }

    return { register, unregister, findByIntent, get, list, setEnabled };
})();
