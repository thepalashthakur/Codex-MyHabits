import {
  calculateHabitStatistics, dateFromDay, dayNumber, habitOnDate, isHabitScheduledForDate,
  logAchievesGoal, periodKey, shiftDate, weekday,
  type Area, type Habit, type HabitLog, type HabitPause, type ScheduleVersion,
} from "./domain";

export type InsightData = { habits: Habit[]; logs: HabitLog[]; versions: ScheduleVersion[]; pauses: HabitPause[]; areas: Area[] };
export const MIN_RANKING_OPPORTUNITIES = 5;

function logsByHabit(logs: HabitLog[]) {
  const result = new Map<string, HabitLog[]>();
  for (const log of logs) result.set(log.habit_id, [...(result.get(log.habit_id) ?? []), log]);
  return result;
}

export function getHabitPerformance(data: InsightData, from: string, to: string) {
  const byHabit = logsByHabit(data.logs);
  return data.habits.map(habit => ({ habit, ...calculateHabitStatistics(habit, byHabit.get(habit.id) ?? [], from, to, data.versions, data.pauses) }))
    .filter(row => row.opportunities > 0);
}

export function getOverallConsistency(data: InsightData, from: string, to: string) {
  const rows = getHabitPerformance(data, from, to);
  const completed = rows.reduce((sum, row) => sum + row.successfulOpportunities, 0);
  const opportunities = rows.reduce((sum, row) => sum + row.opportunities, 0);
  return { completed, opportunities, rate: opportunities ? completed / opportunities : 0 };
}

export function getPeriodComparison(data: InsightData, from: string, to: string) {
  const length = dayNumber(to) - dayNumber(from) + 1;
  const previousTo = shiftDate(from, -1);
  const previousFrom = shiftDate(previousTo, 1 - length);
  const current = getOverallConsistency(data, from, to);
  const previous = getOverallConsistency(data, previousFrom, previousTo);
  return { current, previous, change: current.rate - previous.rate, previousFrom, previousTo };
}

export function getWeekdayPerformance(data: InsightData, from: string, to: string) {
  const rows = Array.from({ length: 7 }, (_, day) => ({ day, completed: 0, opportunities: 0, rate: 0 }));
  const byHabit = new Map(data.logs.map(log => [`${log.habit_id}:${log.date}`, log]));
  for (let day = dayNumber(from); day <= dayNumber(to); day++) {
    const date = dateFromDay(day);
    for (const habit of data.habits) {
      const dated = habitOnDate(habit, data.versions, date);
      // A flexible period target has one weekly/monthly opportunity, not one per weekday.
      if (["WEEKLY_TARGET", "MONTHLY_TARGET"].includes(dated.schedule_type) || !isHabitScheduledForDate(dated, date, data.pauses)) continue;
      const row = rows[weekday(date)];
      row.opportunities++;
      if (logAchievesGoal(dated, byHabit.get(`${habit.id}:${date}`))) row.completed++;
    }
  }
  return rows.map(row => ({ ...row, rate: row.opportunities ? row.completed / row.opportunities : 0 }));
}

export function getAreaPerformance(data: InsightData, from: string, to: string) {
  const rows = new Map<string, { area: Area; completed: number; opportunities: number; habits: Set<string> }>();
  for (const area of data.areas) rows.set(area.id, { area, completed: 0, opportunities: 0, habits: new Set() });
  const byHabit = logsByHabit(data.logs);
  for (const habit of data.habits) {
    const logs = byHabit.get(habit.id) ?? [];
    const byDate = new Map(logs.map(log => [log.date, log]));
    const seenPeriods = new Set<string>();
    for (let day = dayNumber(from); day <= dayNumber(to); day++) {
      const date = dateFromDay(day);
      const dated = habitOnDate(habit, data.versions, date);
      if (!dated.area_id || !rows.has(dated.area_id) || !isHabitScheduledForDate(dated, date, data.pauses)) continue;
      const row = rows.get(dated.area_id)!;
      row.habits.add(habit.id);
      if (dated.schedule_type === "WEEKLY_TARGET" || dated.schedule_type === "MONTHLY_TARGET") {
        const key = `${habit.id}:${periodKey(date, dated.schedule_type)}`;
        if (seenPeriods.has(key)) continue;
        seenPeriods.add(key);
        row.opportunities++;
        const start = periodKey(date, dated.schedule_type);
        const end = dated.schedule_type === "WEEKLY_TARGET" ? shiftDate(start, 6) : dateFromDay(dayNumber(`${start.slice(0, 7)}-01`) + new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0)).getUTCDate() - 1);
        const achieved = logs.filter(log => log.date >= start && log.date <= end && log.date >= from && log.date <= to && logAchievesGoal(habitOnDate(habit, data.versions, log.date), log)).length;
        if (achieved >= (dated.schedule_config.target ?? 1)) row.completed++;
      } else {
        row.opportunities++;
        if (logAchievesGoal(dated, byDate.get(date))) row.completed++;
      }
    }
  }
  return [...rows.values()].map(row => ({ area: row.area, completed: row.completed, opportunities: row.opportunities, habitCount: row.habits.size, rate: row.opportunities ? row.completed / row.opportunities : 0 }));
}

export function getHabitRankings(data: InsightData, from: string, to: string) {
  const eligible = getHabitPerformance(data, from, to).filter(row => row.opportunities >= MIN_RANKING_OPPORTUNITIES);
  return {
    strongest: [...eligible].sort((a, b) => b.completionRate - a.completionRate || b.opportunities - a.opportunities).slice(0, 3),
    needsAttention: [...eligible].sort((a, b) => a.completionRate - b.completionRate || b.opportunities - a.opportunities).slice(0, 3),
  };
}

export function getWeeklyReviewSummary(data: InsightData, today: string) {
  const from = shiftDate(today, -6);
  const comparison = getPeriodComparison(data, from, today);
  const performance = getHabitPerformance(data, from, today);
  const ranking = getHabitRankings(data, from, today);
  return {
    from, to: today, ...comparison,
    completed: performance.reduce((sum, row) => sum + row.completed, 0),
    skipped: performance.reduce((sum, row) => sum + row.skipped, 0),
    missed: performance.reduce((sum, row) => sum + row.missed, 0),
    best: ranking.strongest[0], needsAttention: ranking.needsAttention[0],
  };
}
