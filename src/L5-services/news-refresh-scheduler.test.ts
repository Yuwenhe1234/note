import { describe, expect, it, vi } from "vitest";
import { createNewsRefreshScheduler } from "./news-refresh-scheduler";
import type { NewsRefreshSchedule } from "../L4-data/news-model";

describe("news refresh scheduler", () => {
  it("triggers a due time once per minute", async () => {
    let schedule: NewsRefreshSchedule = { enabled: true, times: ["09:00"] };
    const refresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createNewsRefreshScheduler({ load: () => schedule, save: (value) => { schedule = value; }, refresh, now: () => new Date("2026-09-08T09:00:10") });
    await scheduler.tick();
    await scheduler.tick();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
