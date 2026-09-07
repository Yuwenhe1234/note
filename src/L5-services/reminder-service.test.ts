import { afterEach, describe, expect, it, vi } from "vitest";
import { createReminderService } from "./reminder-service";

afterEach(() => vi.useRealTimers());

describe("reminder service", () => {
  it("requests permission and sends a test notification", async () => {
    const notify = vi.fn();
    let permission: "default" | "granted" = "default";
    const service = createReminderService({
      permission: () => permission,
      requestPermission: async () => (permission = "granted"),
      notify,
      now: () => 0,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });
    expect(await service.enable()).toBe(true);
    expect(service.test()).toBe(true);
    expect(notify).toHaveBeenCalledWith("任务提醒测试", expect.anything());
  });
  it("schedules and cancels a deadline reminder", () => {
    vi.useFakeTimers();
    const notify = vi.fn();
    const service = createReminderService({
      permission: () => "granted",
      requestPermission: async () => "granted",
      notify,
      now: () => 0,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });
    service.schedule({
      id: "1",
      title: "提交报告",
      deadlineMs: 60000,
      leadMinutes: 0,
    });
    vi.advanceTimersByTime(60000);
    expect(notify).toHaveBeenCalled();
    service.schedule({
      id: "2",
      title: "取消任务",
      deadlineMs: 120000,
      leadMinutes: 0,
    });
    service.cancel("2");
    vi.advanceTimersByTime(60000);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
