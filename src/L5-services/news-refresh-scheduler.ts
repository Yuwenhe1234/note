import type { NewsRefreshSchedule } from "../L4-data/news-model";

export function createNewsRefreshScheduler({ load, save, refresh, now = () => new Date() }: { load: () => NewsRefreshSchedule; save: (schedule: NewsRefreshSchedule) => void; refresh: () => Promise<void>; now?: () => Date }) {
  let running = false;
  const tick = async () => {
    const schedule = load(); const date = now(); const minute = `${date.toISOString().slice(0, 10)}-${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    if (!schedule.enabled || running || !schedule.times.includes(time) || schedule.lastTriggeredMinute === minute) return;
    running = true; save({ ...schedule, lastTriggeredMinute: minute });
    try { await refresh(); save({ ...load(), lastCompletedAt: now().toISOString() }); } finally { running = false; }
  };
  return { tick, start: () => setInterval(() => { void tick(); }, 30_000) };
}
