import { isHabitScheduledForDate, type Habit, type HabitLog } from "./domain";
export class LogRuleError extends Error {}
export function prepareLog(habit: Habit, date: string, status: HabitLog["status"] | null, value?: number | null) {
  if (!isHabitScheduledForDate(habit, date)) throw new LogRuleError("Habit is not scheduled for this date.");
  if (status === null) return null;
  if (habit.tracking_type === "MEASURABLE" && status === "COMPLETED" && value == null) throw new LogRuleError("A value is required.");
  return { status, value: status === "COMPLETED" ? (value ?? null) : null };
}
