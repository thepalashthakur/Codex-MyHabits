import Link from "next/link";
import { dateFromDay, dayNumber, habitOnDate, isHabitPausedForDate, isHabitScheduledForDate, logAchievesGoal, type Habit, type HabitLog, type HabitPause, type ScheduleVersion } from "@/lib/domain";

export function HabitHeatmap({ habit, logs, versions, pauses, from, to }: { habit: Habit; logs: HabitLog[]; versions: ScheduleVersion[]; pauses: HabitPause[]; from: string; to: string }) {
  const byDate = new Map(logs.map(log => [log.date, log]));
  const dates = Array.from({ length: dayNumber(to) - dayNumber(from) + 1 }, (_, index) => dateFromDay(dayNumber(from) + index));
  return <div className="habit-heatmap" aria-label={`${habit.name} activity from ${from} to ${to}`}>{dates.map(date => {
    const datedHabit = habitOnDate(habit, versions, date);
    const log = byDate.get(date);
    const paused = isHabitPausedForDate(habit.id, date, pauses);
    const scheduled = isHabitScheduledForDate(datedHabit, date, pauses);
    const state = paused ? "Paused" : !scheduled ? "Not scheduled" : log?.status === "SKIPPED" ? "Skipped" : log?.status === "FAILED" ? "Failed" : logAchievesGoal(datedHabit, log) ? "Completed" : log?.status === "COMPLETED" ? "Partial" : date < to ? "Missed" : "Pending";
    return <Link href={`/today?date=${date}`} className={`heatmap-day heatmap-${state.toLowerCase().replaceAll(" ", "-")}`} key={date} aria-label={`${date}: ${state}`} title={`${date}: ${state}`}><time dateTime={date}>{date.slice(-2)}</time><span>{state === "Completed" ? "✓" : state === "Partial" ? "◐" : state === "Failed" ? "×" : state === "Skipped" ? "→" : state === "Paused" ? "Ⅱ" : "·"}</span></Link>;
  })}</div>;
}
