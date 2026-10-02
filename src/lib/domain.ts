export type ScheduleType = "DAILY" | "WEEKDAYS" | "WEEKLY_TARGET" | "MONTHLY_TARGET" | "INTERVAL";
export type Habit = {
  id: string; user_id: string; area_id: string | null; name: string; description: string | null;
  type: "GOOD" | "BAD"; tracking_type: "BOOLEAN" | "MEASURABLE";
  goal_value: number | null; unit: string | null; schedule_type: ScheduleType;
  schedule_config: { weekdays?: number[]; target?: number; interval?: number };
  start_date: string; end_date: string | null; color: string | null; icon: string | null;
  position: number; is_archived: boolean; archived_at: string | null;
};
export type HabitLog = { id: string; habit_id: string; user_id: string; date: string; status: "COMPLETED" | "FAILED" | "SKIPPED"; value: number | null };
export type Area = { id: string; user_id: string; name: string; color: string | null; icon: string | null; position: number };

export function dayNumber(date: string) { return Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000); }
export function dateFromDay(day: number) { return new Date(day * 86400000).toISOString().slice(0, 10); }
export function shiftDate(date: string, days: number) { return dateFromDay(dayNumber(date) + days); }
export function localDate(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function weekday(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function weekStart(date: string) { return shiftDate(date, -((weekday(date) + 6) % 7)); }
export function monthStart(date: string) { return `${date.slice(0, 7)}-01`; }
export function isHabitScheduledForDate(habit: Habit, date: string) {
  if (habit.is_archived || date < habit.start_date || (habit.end_date && date > habit.end_date)) return false;
  switch (habit.schedule_type) {
    case "DAILY": case "WEEKLY_TARGET": case "MONTHLY_TARGET": return true;
    case "WEEKDAYS": return (habit.schedule_config.weekdays ?? []).includes(weekday(date));
    case "INTERVAL": return (dayNumber(date) - dayNumber(habit.start_date)) % (habit.schedule_config.interval ?? 1) === 0;
  }
}
export function getScheduledHabits(habits: Habit[], date: string) { return habits.filter(h => isHabitScheduledForDate(h, date)); }
export function logAchievesGoal(habit: Habit, log?: HabitLog) {
  if (!log || log.status !== "COMPLETED") return false;
  return habit.tracking_type === "BOOLEAN" || Number(log.value ?? 0) >= Number(habit.goal_value ?? 0);
}
export function periodKey(date: string, type: ScheduleType) { return type === "WEEKLY_TARGET" ? weekStart(date) : monthStart(date); }
function periodEnd(key: string, type: ScheduleType) {
  return type === "WEEKLY_TARGET" ? shiftDate(key, 6) : shiftDate(`${key.slice(0, 7)}-${String(new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`, 0);
}
export function calculateStreaks(habit: Habit, logs: HabitLog[], today: string) {
  const byDate = new Map(logs.map(log => [log.date, log]));
  if (habit.schedule_type === "WEEKLY_TARGET" || habit.schedule_type === "MONTHLY_TARGET") {
    const type = habit.schedule_type;
    const target = habit.schedule_config.target ?? 1;
    const counts = new Map<string, number>();
    for (const log of logs) if (logAchievesGoal(habit, log)) {
      const key = periodKey(log.date, type);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const keys: string[] = [];
    let key = periodKey(habit.start_date, type);
    const last = periodKey(today, type);
    while (key <= last) {
      keys.push(key);
      key = type === "WEEKLY_TARGET" ? shiftDate(key, 7) : new Date(`${key}T12:00:00Z`).toISOString().slice(0, 7) === "9999-12" ? "9999-12-31" : new Date(Date.UTC(Number(key.slice(0,4)), Number(key.slice(5,7)), 1)).toISOString().slice(0,10);
      if (keys.length > 6000) break;
    }
    const achieved = keys.map(k => (counts.get(k) ?? 0) >= target);
    let best = 0, run = 0;
    for (const yes of achieved) { run = yes ? run + 1 : 0; best = Math.max(best, run); }
    let index = keys.length - 1;
    if (index >= 0 && !achieved[index] && today < periodEnd(keys[index], type)) index--;
    let current = 0;
    for (; index >= 0 && achieved[index]; index--) current++;
    return { current, best };
  }
  let best = 0, run = 0;
  const scheduled: string[] = [];
  for (let day = dayNumber(habit.start_date); day <= dayNumber(today); day++) {
    const date = dateFromDay(day);
    if (isHabitScheduledForDate(habit, date)) scheduled.push(date);
  }
  for (const date of scheduled) {
    const log = byDate.get(date);
    // A skip is neutral: it preserves a run but does not add to it.
    if (log?.status === "SKIPPED") continue;
    run = logAchievesGoal(habit, log) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  let index = scheduled.length - 1;
  if (scheduled[index] === today && !byDate.has(today)) index--;
  let current = 0;
  for (; index >= 0; index--) {
    const log = byDate.get(scheduled[index]);
    if (log?.status === "SKIPPED") continue;
    if (!logAchievesGoal(habit, log)) break;
    current++;
  }
  return { current, best };
}
export function calculateHabitStatistics(habit: Habit, logs: HabitLog[], from: string, to: string) {
  const relevant = logs.filter(log => log.date >= from && log.date <= to);
  let opportunities = 0;
  for (let day = dayNumber(from); day <= dayNumber(to); day++) if (isHabitScheduledForDate(habit, dateFromDay(day))) opportunities++;
  const completed = relevant.filter(log => logAchievesGoal(habit, log)).length;
  const failed = relevant.filter(log => log.status === "FAILED").length;
  const skipped = relevant.filter(log => log.status === "SKIPPED").length;
  const values = relevant.filter(log => log.status === "COMPLETED").map(log => Number(log.value ?? 0));
  return { opportunities, completed, failed, skipped, completionRate: opportunities ? completed / opportunities : 0,
    totalValue: values.reduce((sum, v) => sum + v, 0), averageValue: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
    goalAchievementRate: opportunities ? completed / opportunities : 0 };
}
