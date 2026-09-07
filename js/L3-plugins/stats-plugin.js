/**
 * [L3 能力插件层] StatsPlugin - 统计查询
 * 意图：stats.get
 * 能力：任务总量/状态/优先级/类型分布统计，供仪表盘视图调用
 */

class StatsPlugin extends BasePlugin {
    constructor() {
        super({
            name: 'stats',
            version: '1.0.0',
            description: '任务统计与分布分析',
            intents: ['stats.get']
        });
    }

    execute() {
        return TaskRepository.getStats();
    }
}
