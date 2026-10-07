export type ScheduleType = "DAILY" | "WEEKDAYS" | "WEEKLY_TARGET" | "MONTHLY_TARGET" | "INTERVAL";
export type TimeOfDay = "MORNING" | "AFTERNOON" | "EVENING" | "ANYTIME";
export type HabitPause = { id: string; habit_id: string; user_id: string; start_date: string; end_date: string | null; reason: string | null; note: string | null };
export type Habit = {
  id: string; user_id: string; area_id: string | null; name: string; description: string | null;
  type: "GOOD" | "BAD"; tracking_type: "BOOLEAN" | "MEASURABLE";
  goal_value: number | null; unit: string | null; schedule_type: ScheduleType;
  schedule_config: { weekdays?: number[]; target?: number; interval?: number };
  start_date: string; end_date: string | null; color: string | null; icon: string | null;
  position: number; is_archived: boolean; archived_at: string | null; archived_date?: string | null;
  time_of_day?: TimeOfDay; priority?: "LOW" | "NORMAL" | "HIGH"; difficulty?: "EASY" | "MODERATE" | "HARD" | null;
  quick_increments?: number[] | null; minimum_goal_value?: number | null; stretch_goal_value?: number | null;
};
export type ScheduleVersion = Pick<Habit, "type" | "tracking_type" | "goal_value" | "unit" | "schedule_type" | "schedule_config" | "start_date" | "end_date" | "is_archived"> & { habit_id: string; effective_date: string };
export type HabitLog = { id: string; habit_id: string; user_id: string; date: string; status: "COMPLETED" | "FAILED" | "SKIPPED"; value: number | null; reason?: string | null };
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
export function isHabitPausedForDate(habitId: string, date: string, pauses: HabitPause[] = []) {
  return pauses.some(pause => pause.habit_id === habitId && pause.start_date <= date && (!pause.end_date || date <= pause.end_date));
}
export function isHabitScheduledForDate(habit: Habit, date: string, pauses: HabitPause[] = []) {
  if (isHabitPausedForDate(habit.id, date, pauses)) return false;
  if (habit.is_archived || date < habit.start_date || (habit.end_date && date > habit.end_date)) return false;
  switch (habit.schedule_type) {
    case "DAILY": case "WEEKLY_TARGET": case "MONTHLY_TARGET": return true;
    case "WEEKDAYS": return (habit.schedule_config.weekdays ?? []).includes(weekday(date));
    case "INTERVAL": return (dayNumber(date) - dayNumber(habit.start_date)) % (habit.schedule_config.interval ?? 1) === 0;
  }
}
export function habitOnDate(habit: Habit, versions: ScheduleVersion[], date: string): Habit {
  const all = versions.filter(v => v.habit_id === habit.id);
  const history = all.filter(v => v.effective_date <= date).sort((a,b) => b.effective_date.localeCompare(a.effective_date));
  const version = history[0];
  if (!version && all.length) return { ...habit, is_archived: true };
  return version ? { ...habit, type: version.type, tracking_type: version.tracking_type, goal_value: version.goal_value, unit: version.unit, schedule_type: version.schedule_type, schedule_config: version.schedule_config, start_date: version.start_date, end_date: version.end_date, is_archived: version.is_archived } : habit;
}
export function getScheduledHabits(habits: Habit[], date: string, versions: ScheduleVersion[] = [], pauses: HabitPause[] = []) { return habits.map(h => habitOnDate(h, versions, date)).filter(h => isHabitScheduledForDate(h, date, pauses)); }
export function logAchievesGoal(habit: Habit, log?: HabitLog) {
  if (!log || log.status !== "COMPLETED") return false;
  return habit.tracking_type === "BOOLEAN" || Number(log.value ?? 0) >= Number(habit.goal_value ?? 0);
}
export function periodKey(date: string, type: ScheduleType) { return type === "WEEKLY_TARGET" ? weekStart(date) : monthStart(date); }
function periodEnd(key: string, type: ScheduleType) {
  return type === "WEEKLY_TARGET" ? shiftDate(key, 6) : shiftDate(`${key.slice(0, 7)}-${String(new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`, 0);
}
export function calculateStreaks(habit: Habit, logs: HabitLog[], today: string, versions: ScheduleVersion[] = [], pauses: HabitPause[] = []) {
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
    const eligible = keys.map(k => {
      const end = periodEnd(k, type);
      for (let day = dayNumber(k); day <= dayNumber(end); day++) {
        const date = dateFromDay(day);
        if (date <= today && isHabitScheduledForDate(habitOnDate(habit, versions, date), date, pauses)) return true;
      }
      return false;
    });
    let best = 0, run = 0;
    for (let i = 0; i < achieved.length; i++) { if (!eligible[i]) continue; run = achieved[i] ? run + 1 : 0; best = Math.max(best, run); }
    let index = keys.length - 1;
    if (index >= 0 && !achieved[index] && today <= periodEnd(keys[index], type)) index--;
    let current = 0;
    for (; index >= 0; index--) { if (!eligible[index]) continue; if (!achieved[index]) break; current++; }
    return { current, best };
  }
  let best = 0, run = 0;
  const scheduled: string[] = [];
  for (let day = dayNumber(habit.start_date); day <= dayNumber(today); day++) {
    const date = dateFromDay(day);
    if (isHabitScheduledForDate(habitOnDate(habit, versions, date), date, pauses)) scheduled.push(date);
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
export function calculateHabitStatistics(habit: Habit, logs: HabitLog[], from: string, to: string, versions: ScheduleVersion[] = [], pauses: HabitPause[] = []) {
  const relevant = logs.filter(log => log.date >= from && log.date <= to);
  const scheduledDates: string[] = [];
  for (let day = dayNumber(from); day <= dayNumber(to); day++) { const date = dateFromDay(day); if (isHabitScheduledForDate(habitOnDate(habit, versions, date), date, pauses)) scheduledDates.push(date); }
  const completed = relevant.filter(log => scheduledDates.includes(log.date) && logAchievesGoal(habitOnDate(habit, versions, log.date), log)).length;
  const failed = relevant.filter(log => log.status === "FAILED").length;
  const skipped = relevant.filter(log => log.status === "SKIPPED").length;
  const values = relevant.filter(log => log.status === "COMPLETED" && scheduledDates.includes(log.date)).map(log => Number(log.value ?? 0));
  const partial = relevant.filter(log => scheduledDates.includes(log.date) && log.status === "COMPLETED" && !logAchievesGoal(habitOnDate(habit, versions, log.date), log)).length;
  const paused = pauses.filter(pause => pause.habit_id === habit.id).reduce((count, pause) => count + Math.max(0, dayNumber((pause.end_date && pause.end_date < to ? pause.end_date : to)) - dayNumber(pause.start_date > from ? pause.start_date : from) + 1), 0);
  let opportunities = scheduledDates.length, successfulOpportunities = completed;
  if (habit.schedule_type === "WEEKLY_TARGET" || habit.schedule_type === "MONTHLY_TARGET") {
    const keys = new Set(scheduledDates.map(date => periodKey(date, habit.schedule_type)));
    opportunities = keys.size;
    successfulOpportunities = [...keys].filter(key => relevant.filter(log => periodKey(log.date, habit.schedule_type) === key && logAchievesGoal(habitOnDate(habit, versions, log.date), log)).length >= (habit.schedule_config.target ?? 1)).length;
  }
  return { opportunities, successfulOpportunities, completed, failed, skipped, partial, paused, missed: Math.max(0, opportunities - successfulOpportunities - failed - skipped - partial), completionRate: opportunities ? successfulOpportunities / opportunities : 0,
    totalValue: values.reduce((sum, v) => sum + v, 0), averageValue: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
    goalAchievementRate: opportunities ? successfulOpportunities / opportunities : 0 };
}
