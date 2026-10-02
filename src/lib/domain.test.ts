import { describe, expect, it } from "vitest";
import { calculateHabitStatistics, calculateStreaks, getScheduledHabits, isHabitScheduledForDate, localDate, type Habit, type HabitLog, type ScheduleVersion } from "./domain";
const habit: Habit = { id: "h", user_id: "u", area_id: null, name: "Read", description: null, type: "GOOD", tracking_type: "BOOLEAN", goal_value: null, unit: null, schedule_type: "DAILY", schedule_config: {}, start_date: "2026-09-28", end_date: null, color: null, icon: null, position: 0, is_archived: false, archived_at: null };
const log = (date: string, status: HabitLog["status"] = "COMPLETED", value: number | null = null): HabitLog => ({ id: date, habit_id: "h", user_id: "u", date, status, value });
describe("schedule", () => {
  it("respects weekdays and bounds", () => {
    const h = { ...habit, schedule_type: "WEEKDAYS" as const, schedule_config: { weekdays: [1,3,5] }, end_date: "2026-10-02" };
    expect(isHabitScheduledForDate(h, "2026-09-29")).toBe(false);
    expect(isHabitScheduledForDate(h, "2026-09-30")).toBe(true);
    expect(isHabitScheduledForDate(h, "2026-10-05")).toBe(false);
  });
  it("respects intervals and archives", () => {
    const h = { ...habit, schedule_type: "INTERVAL" as const, schedule_config: { interval: 2 } };
    expect(isHabitScheduledForDate(h, "2026-09-29")).toBe(false);
    expect(isHabitScheduledForDate(h, "2026-09-30")).toBe(true);
    expect(isHabitScheduledForDate({ ...h, is_archived: true }, "2026-09-30")).toBe(false);
  });
});
describe("streaks", () => {
  it("counts consecutive daily completions", () => expect(calculateStreaks(habit, [log("2026-09-28"), log("2026-09-29"), log("2026-09-30")], "2026-09-30")).toEqual({ current: 3, best: 3 }));
  it("ignores unscheduled weekdays and keeps skips neutral", () => {
    const h = { ...habit, schedule_type: "WEEKDAYS" as const, schedule_config: { weekdays: [1,3,5] } };
    expect(calculateStreaks(h, [log("2026-09-28"), log("2026-09-30", "SKIPPED"), log("2026-10-02")], "2026-10-02")).toEqual({ current: 2, best: 2 });
  });
  it("counts weekly target by period", () => {
    const h = { ...habit, schedule_type: "WEEKLY_TARGET" as const, schedule_config: { target: 3 } };
    expect(calculateStreaks(h, [log("2026-09-28"), log("2026-09-29"), log("2026-09-30")], "2026-10-03")).toEqual({ current: 1, best: 1 });
    expect(calculateHabitStatistics(h, [log("2026-09-28"), log("2026-09-29"), log("2026-09-30")], "2026-09-28", "2026-10-03").completionRate).toBe(1);
  });
  it("does not count incomplete measured logs", () => {
    const h = { ...habit, tracking_type: "MEASURABLE" as const, goal_value: 3, unit: "L" };
    expect(calculateHabitStatistics(h, [log("2026-09-28", "COMPLETED", 2), log("2026-09-29", "COMPLETED", 3)], "2026-09-28", "2026-09-29").completed).toBe(1);
  });
});
it("uses the user's calendar day", () => expect(localDate("Asia/Kolkata", new Date("2026-10-02T18:30:00Z"))).toBe("2026-10-03"));
it("preserves old schedules after an edit or archive", () => {
  const current = { ...habit, schedule_type: "WEEKDAYS" as const, schedule_config: { weekdays: [1] }, is_archived: true, archived_date: "2026-10-03" };
  const versions: ScheduleVersion[] = [
    { habit_id: "h", effective_date: "2026-09-28", type: "GOOD", tracking_type: "BOOLEAN", goal_value: null, unit: null, schedule_type: "DAILY", schedule_config: {}, start_date: "2026-09-28", end_date: null, is_archived: false },
    { habit_id: "h", effective_date: "2026-10-03", type: "GOOD", tracking_type: "BOOLEAN", goal_value: null, unit: null, schedule_type: "WEEKDAYS", schedule_config: { weekdays: [1] }, start_date: "2026-09-28", end_date: null, is_archived: true },
  ];
  expect(getScheduledHabits([current], "2026-10-02", versions)).toHaveLength(1);
  expect(getScheduledHabits([current], "2026-10-03", versions)).toHaveLength(0);
});
