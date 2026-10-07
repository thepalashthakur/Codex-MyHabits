import { isHabitScheduledForDate, type Habit, type HabitLog, type HabitPause } from "./domain";
export class LogRuleError extends Error {}
export function prepareLog(habit: Habit, date: string, status: HabitLog["status"] | null, value?: number | null, pauses: HabitPause[] = [], reason?: string | null) {
  if (status === null) return null;
  if (!isHabitScheduledForDate(habit, date, pauses)) throw new LogRuleError("Habit is not scheduled for this date.");
  if (habit.tracking_type === "MEASURABLE" && status === "COMPLETED" && value == null) throw new LogRuleError("A value is required.");
  return { status, value: status === "COMPLETED" ? (value ?? null) : null, ...(reason ? { reason } : {}) };
}
