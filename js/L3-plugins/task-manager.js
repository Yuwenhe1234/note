/**
 * [L3 能力插件层] TaskManagerPlugin - 备忘录基础管理
 * 意图：task.create / task.update / task.delete / task.toggleSubtask
 *       task.setStatus / task.query / task.getToday / task.getOverdue
 * 能力：任务 CRUD、状态管理、筛选查询 —— 全部委托 TaskRepository（L4）
 */

class TaskManagerPlugin extends BasePlugin {
    constructor() {
        super({
            name: 'task-manager',
            version: '1.0.0',
            description: '任务增删改查与状态管理',
            intents: [
                'task.create', 'task.update', 'task.delete',
                'task.toggleSubtask', 'task.setStatus',
                'task.query', 'task.get', 'task.getToday', 'task.getOverdue'
            ]
        });
    }

    execute(payload, intent) {
        switch (intent) {
            case 'task.create':       return TaskRepository.create(payload.task);
            case 'task.update':       return TaskRepository.update(payload.id, payload.updates);
            case 'task.delete':       return TaskRepository.remove(payload.id);
            case 'task.toggleSubtask':return TaskRepository.toggleSubtask(payload.id, payload.index);
            case 'task.setStatus':    return TaskRepository.updateStatus(payload.id, payload.status);
            case 'task.query':        return TaskRepository.query(payload.filters, payload.sortBy);
            case 'task.get':          return TaskRepository.getById(payload.id);
            case 'task.getToday':     return TaskRepository.getToday();
            case 'task.getOverdue':   return TaskRepository.getOverdue();
            default:
                Logger.warn(`[task-manager] 未支持的意图: ${intent}`);
                return null;
        }
    }
}
