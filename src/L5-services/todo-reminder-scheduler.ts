export type TodayReminderTodo = {
  id: string;
  content: string;
  reminderTime: string;
  completed: boolean;
};

export type TodoReminderEvent = {
  todo: TodayReminderTodo;
  scheduledForMs: number;
  triggeredAtMs: number;
};

type Dependencies = {
  now: () => number;
  setTimer: typeof setTimeout;
  clearTimer: typeof clearTimeout;
};

export function createTodoReminderScheduler(dependencies: Dependencies) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const listeners = new Set<(event: TodoReminderEvent) => void>();

  function dispose() {
    timers.forEach((timer) => dependencies.clearTimer(timer));
    timers.clear();
  }

  function subscribe(listener: (event: TodoReminderEvent) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function sync(todos: TodayReminderTodo[]) {
    dispose();
    todos.filter((todo) => !todo.completed).forEach((todo) => {
      const parts = /^(\d{2}):(\d{2})$/.exec(todo.reminderTime);
      if (!parts) return;
      const hours = Number(parts[1]);
      const minutes = Number(parts[2]);
      if (hours > 23 || minutes > 59) return;
      const scheduled = new Date(dependencies.now());
      scheduled.setHours(hours, minutes, 0, 0);
      const delay = scheduled.getTime() - dependencies.now();
      if (delay <= 0) return;
      timers.set(todo.id, dependencies.setTimer(() => {
        timers.delete(todo.id);
        const event: TodoReminderEvent = {
          todo,
          scheduledForMs: scheduled.getTime(),
          triggeredAtMs: dependencies.now(),
        };
        listeners.forEach((listener) => listener(event));
      }, delay));
    });
  }

  return { sync, subscribe, dispose };
}
