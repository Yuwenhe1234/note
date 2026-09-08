import { afterEach, describe, expect, it, vi } from "vitest";
import { createTodoReminderScheduler } from "./todo-reminder-scheduler";

afterEach(() => vi.useRealTimers());

describe("todo reminder scheduler", () => {
  it("publishes one due todo once", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const scheduler = createTodoReminderScheduler({
      now: () => new Date("2026-09-08T09:00:00").getTime(),
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });
    scheduler.subscribe(listener);

    scheduler.sync([
      { id: "t1", content: "写周报", reminderTime: "09:01", completed: false },
    ]);
    vi.advanceTimersByTime(60_000);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].todo.content).toBe("写周报");
  });

  it("clears replaced todos and skips completed, past, or invalid todos", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const scheduler = createTodoReminderScheduler({
      now: () => new Date("2026-09-08T09:00:00").getTime(),
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });
    scheduler.subscribe(listener);

    scheduler.sync([{ id: "t1", content: "旧", reminderTime: "09:01", completed: false }]);
    scheduler.sync([
      { id: "t1", content: "新", reminderTime: "09:02", completed: false },
      { id: "done", content: "完成", reminderTime: "09:01", completed: true },
      { id: "past", content: "过去", reminderTime: "08:59", completed: false },
      { id: "bad", content: "错误", reminderTime: "bad", completed: false },
    ]);
    vi.advanceTimersByTime(120_000);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].todo.content).toBe("新");
  });

  it("stops sending events after a listener unsubscribes", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const scheduler = createTodoReminderScheduler({
      now: () => new Date("2026-09-08T09:00:00").getTime(),
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });
    const unsubscribe = scheduler.subscribe(listener);
    unsubscribe();

    scheduler.sync([{ id: "t1", content: "写周报", reminderTime: "09:01", completed: false }]);
    vi.advanceTimersByTime(60_000);

    expect(listener).not.toHaveBeenCalled();
  });
});
