type Permission = "default" | "granted" | "denied";
type Dependencies = {
  permission: () => Permission;
  requestPermission: () => Promise<Permission>;
  notify: (title: string, options?: NotificationOptions) => unknown;
  now: () => number;
  setTimer: typeof setTimeout;
  clearTimer: typeof clearTimeout;
};
type Reminder = {
  id: string;
  title: string;
  deadlineMs: number;
  leadMinutes: number;
};

export function createReminderService(dependencies: Dependencies) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  async function enable() {
    const current = dependencies.permission();
    if (current === "granted") return true;
    if (current === "denied") return false;
    return (await dependencies.requestPermission()) === "granted";
  }
  function test() {
    if (dependencies.permission() !== "granted") return false;
    dependencies.notify("任务提醒测试", {
      body: "浏览器通知已经可以正常工作。",
    });
    return true;
  }
  function notifyTodo(title: string, reminderTime: string) {
    if (dependencies.permission() !== "granted") return false;
    dependencies.notify(`待办提醒：${title}`, { body: `设定时间：${reminderTime}` });
    return true;
  }
  function cancel(id: string) {
    const timer = timers.get(id);
    if (timer) dependencies.clearTimer(timer);
    timers.delete(id);
  }
  function schedule(reminder: Reminder) {
    cancel(reminder.id);
    if (dependencies.permission() !== "granted") return false;
    const delay =
      reminder.deadlineMs - reminder.leadMinutes * 60000 - dependencies.now();
    if (delay < 0) return false;
    timers.set(
      reminder.id,
      dependencies.setTimer(() => {
        dependencies.notify(reminder.title, {
          body: reminder.leadMinutes
            ? `${reminder.leadMinutes} 分钟后到期`
            : "任务已经到期",
        });
        timers.delete(reminder.id);
      }, delay),
    );
    return true;
  }
  function cancelAll() {
    for (const id of timers.keys()) cancel(id);
  }
  return { enable, test, notifyTodo, schedule, cancel, cancelAll };
}

export const browserReminderService = createReminderService({
  permission: () =>
    typeof Notification === "undefined" ? "denied" : Notification.permission,
  requestPermission: () => Notification.requestPermission(),
  notify: (title, options) => new Notification(title, options),
  now: () => Date.now(),
  setTimer: window.setTimeout.bind(window),
  clearTimer: window.clearTimeout.bind(window),
});
