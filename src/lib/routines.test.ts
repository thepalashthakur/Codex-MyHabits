import { describe, expect, it } from "vitest";
import { parentFirst } from "./routine-data";
import { routineInput } from "./routine-validation";
import { applicableItems, effectiveStatus, localRoutineDate, occurrenceDates, progress, ruleMatches, type ItemOccurrence, type RoutineDefinition, type RoutineItem, type RoutineOccurrence } from "./routines";

const routine: RoutineDefinition = { id: "r", user_id: "u", name: "Morning", description: null, timezone: "Asia/Kolkata", rule: { type: "WEEKDAYS", weekdays: [1, 2, 3, 4, 5] }, preferred_start_time: "07:00:00", start_date: "2026-10-05", end_date: null, is_paused: false, paused_from: null, is_archived: false, planned_offset_days: 0 };
const group: RoutineItem = { id: "g", routine_id: "r", user_id: "u", parent_id: null, position: 0, type: "GROUP", title: "Movement", instructions: null, estimated_minutes: null, required: true, frequency_rule: null, reference_provider: null, reference_id: null };
const stretch: RoutineItem = { ...group, id: "s", parent_id: "g", type: "TASK", title: "Stretch", position: 0 };
const strength: RoutineItem = { ...stretch, id: "t", title: "Strength", position: 1, frequency_rule: { type: "WEEKDAYS", weekdays: [1, 3, 5] } };
const occurrence: RoutineOccurrence = { id: "o", routine_id: "r", user_id: "u", scheduled_date: "2026-10-05", planned_date: "2026-10-05", planned_time: "07:00:00", timezone: "Asia/Kolkata", status: "SCHEDULED", started_at: null, ended_at: null };
const itemOccurrence = (id: string, required: boolean, status: ItemOccurrence["status"]): ItemOccurrence => ({ id, occurrence_id: "o", source_item_id: id, parent_item_occurrence_id: null, position: 0, type: "TASK", title: id, instructions: null, estimated_minutes: null, required, reference_provider: null, reference_id: null, status, completed_at: null, skipped_at: null, habit_log_id: null, habit_tracking_type: null, habit_goal_value: null });

describe("routine recurrence", () => {
  it("uses local calendar dates and permits starting before preferred time", () => {
    expect(localRoutineDate("Asia/Kolkata", new Date("2026-10-04T19:00:00Z"))).toBe("2026-10-05");
    expect(occurrenceDates(routine, "2026-10-05", "2026-10-11")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
  });
  it("anchors every N days and weeks without drifting", () => {
    expect(ruleMatches({ type: "INTERVAL_DAYS", interval: 3 }, "2026-10-11", "2026-10-05")).toBe(true);
    expect(ruleMatches({ type: "INTERVAL_DAYS", interval: 3 }, "2026-10-12", "2026-10-05")).toBe(false);
    expect(ruleMatches({ type: "INTERVAL_WEEKS", interval: 2 }, "2026-10-19", "2026-10-05")).toBe(true);
  });
  it("handles missing monthly dates explicitly", () => {
    expect(ruleMatches({ type: "MONTH_DATES", dates: [31], missing: "SKIP" }, "2027-02-28", "2026-10-01")).toBe(false);
    expect(ruleMatches({ type: "MONTH_DATES", dates: [31], missing: "LAST_DAY" }, "2027-02-28", "2026-10-01")).toBe(true);
    expect(ruleMatches({ type: "MONTH_DATES", dates: [31], missing: "LAST_DAY" }, "2028-02-29", "2026-10-01")).toBe(true);
  });
  it("filters nested child frequency without independent execution", () => {
    expect(applicableItems([group, stretch, strength], "2026-10-06", routine.start_date).map(item => item.id)).toEqual(["g", "s"]);
    expect(applicableItems([group, stretch, strength], "2026-10-07", routine.start_date).map(item => item.id)).toEqual(["g", "s", "t"]);
  });
  it("keeps a pause in history after the routine resumes", () => {
    const pauses = [{ id: "p", routine_id: "r", user_id: "u", start_date: "2026-10-06", end_date: "2026-10-07" }];
    expect(occurrenceDates(routine, "2026-10-05", "2026-10-09", pauses)).toEqual(["2026-10-05", "2026-10-08", "2026-10-09"]);
  });
  it("keeps recurrence anchored when planned dates shift", () => {
    const shifted = { ...routine, planned_offset_days: 1 };
    expect(occurrenceDates(shifted, "2026-10-05", "2026-10-11")).toEqual(occurrenceDates(routine, "2026-10-05", "2026-10-11"));
    const pauses = [{ id: "p", routine_id: "r", user_id: "u", start_date: "2026-10-06", end_date: "2026-10-06" }];
    expect(occurrenceDates(shifted, "2026-10-05", "2026-10-07", pauses)).toEqual(["2026-10-06", "2026-10-07"]);
  });
});

describe("routine steps", () => {
  it("counts required leaves only and keeps skipped steps separate", () => {
    const items = [itemOccurrence("done", true, "DONE"), itemOccurrence("skip", true, "SKIPPED"), itemOccurrence("optional", false, "PENDING"), { ...itemOccurrence("group", true, "PENDING"), type: "GROUP" as const }];
    expect(progress(items)).toMatchObject({ done: 1, total: 2, skipped: 1, complete: false });
    expect(progress(items.map(item => item.id === "skip" ? { ...item, status: "DONE" as const } : item)).complete).toBe(true);
  });
  it("distinguishes missed, partial, completed and skipped at local day end", () => {
    const pending = [itemOccurrence("a", true, "PENDING")];
    expect(effectiveStatus(occurrence, pending, "2026-10-06")).toBe("MISSED");
    expect(effectiveStatus({ ...occurrence, started_at: "2026-10-05T01:00:00Z" }, pending, "2026-10-06")).toBe("PARTIAL");
    expect(effectiveStatus({ ...occurrence, started_at: "2026-10-05T01:00:00Z" }, [itemOccurrence("a", true, "DONE")], "2026-10-06")).toBe("COMPLETED");
    expect(effectiveStatus({ ...occurrence, status: "SKIPPED" }, pending, "2026-10-06")).toBe("SKIPPED");
  });
  it("orders parent before children for stable snapshots", () => {
    expect(parentFirst([strength, stretch, group]).map(item => item.id)).toEqual(["g", "s", "t"]);
  });
  it("rejects impossible child frequencies and cycles", () => {
    const toInput = (item: RoutineItem) => ({ id: item.id, parent_id: item.parent_id, position: item.position, type: item.type, title: item.title, instructions: item.instructions, estimated_minutes: item.estimated_minutes, required: item.required, frequency_rule: item.frequency_rule, reference_provider: item.reference_provider, reference_id: item.reference_id });
    const input = { routine: { name: "Morning", description: null, timezone: "Asia/Kolkata", rule: routine.rule, preferred_start_time: null, start_date: routine.start_date, end_date: null, is_paused: false, paused_from: null, is_archived: false }, items: [toInput({ ...group, id: "11111111-1111-4111-8111-111111111111", parent_id: null }), toInput({ ...strength, id: "22222222-2222-4222-8222-222222222222", parent_id: "11111111-1111-4111-8111-111111111111", frequency_rule: { type: "WEEKDAYS", weekdays: [0, 6] } })] };
    const valid = { ...input, items: [input.items[0], { ...input.items[1], frequency_rule: { type: "WEEKDAYS", weekdays: [1, 3, 5] } }] };
    expect(routineInput.safeParse(valid).success).toBe(true);
    expect(routineInput.safeParse(input).success).toBe(false);
    expect(routineInput.safeParse({ ...input, items: [{ ...input.items[0], parent_id: input.items[1].id }, { ...input.items[1], type: "GROUP", reference_provider: null, reference_id: null, frequency_rule: null }] }).success).toBe(false);
    expect(routineInput.safeParse({ ...valid, routine: { ...valid.routine, timezone: "Mars/Olympus" } }).success).toBe(false);
  });
});
