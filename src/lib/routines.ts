import { dateFromDay, dayNumber, shiftDate, weekday } from "./domain";

export type RoutineRule =
  | { type: "DAILY" }
  | { type: "WEEKDAYS"; weekdays: number[] }
  | { type: "INTERVAL_DAYS"; interval: number }
  | { type: "INTERVAL_WEEKS"; interval: number }
  | { type: "MONTH_DATES"; dates: number[]; missing: "SKIP" | "LAST_DAY" };
export type RoutineDefinition = {
  id: string; user_id: string; name: string; description: string | null; timezone: string;
  rule: RoutineRule; preferred_start_time: string | null; start_date: string; end_date: string | null;
  is_paused: boolean; paused_from: string | null; is_archived: boolean;
  planned_offset_days: number;
};
export type RoutinePause = { id: string; routine_id: string; user_id: string; start_date: string; end_date: string | null };
export type RoutineItem = {
  id: string; routine_id: string; user_id: string; parent_id: string | null; position: number;
  type: "GROUP" | "TASK" | "HABIT_REF"; title: string; instructions: string | null;
  estimated_minutes: number | null; required: boolean; frequency_rule: RoutineRule | null;
  reference_provider: "HABIT" | null; reference_id: string | null;
};
export type RoutineOccurrence = {
  id: string; routine_id: string; user_id: string; scheduled_date: string; planned_date: string;
  planned_time: string | null; timezone: string; status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "SKIPPED" | "MISSED";
  started_at: string | null; ended_at: string | null;
};
export type ItemOccurrence = {
  id: string; occurrence_id: string; source_item_id: string | null; parent_item_occurrence_id: string | null;
  position: number; type: RoutineItem["type"]; title: string; instructions: string | null;
  estimated_minutes: number | null; required: boolean; reference_provider: "HABIT" | null;
  reference_id: string | null; status: "PENDING" | "DONE" | "SKIPPED";
  completed_at: string | null; skipped_at: string | null; habit_log_id: string | null;
  habit_tracking_type: "BOOLEAN" | "MEASURABLE" | null; habit_goal_value: number | null;
};

export function daysInMonth(date: string) {
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
}
export function ruleMatches(rule: RoutineRule, date: string, anchor: string): boolean {
  const elapsed = dayNumber(date) - dayNumber(anchor);
  if (elapsed < 0) return false;
  switch (rule.type) {
    case "DAILY": return true;
    case "WEEKDAYS": return rule.weekdays.includes(weekday(date));
    case "INTERVAL_DAYS": return elapsed % rule.interval === 0;
    case "INTERVAL_WEEKS": return elapsed % (rule.interval * 7) === 0;
    case "MONTH_DATES": {
      const day = Number(date.slice(8, 10));
      const last = daysInMonth(date);
      return rule.dates.some(selected => selected === day || (selected > last && rule.missing === "LAST_DAY" && day === last));
    }
  }
}
export function routineRunsOn(routine: RoutineDefinition, date: string, pauses: RoutinePause[] = []) {
  const plannedDate = shiftDate(date, routine.planned_offset_days);
  return !routine.is_archived && !pauses.some(pause => pause.routine_id === routine.id && pause.start_date <= plannedDate && (!pause.end_date || plannedDate <= pause.end_date))
    && (!routine.is_paused || !routine.paused_from || plannedDate < routine.paused_from)
    && date >= routine.start_date && (!routine.end_date || date <= routine.end_date) && ruleMatches(routine.rule, date, routine.start_date);
}
export function applicableItems(items: RoutineItem[], date: string, anchor: string) {
  const byId = new Map(items.map(item => [item.id, item]));
  const applicable = new Map<string, boolean>();
  const visiting = new Set<string>();
  function includes(item: RoutineItem): boolean {
    const cached = applicable.get(item.id);
    if (cached !== undefined) return cached;
    if (visiting.has(item.id)) throw Error("Routine items cannot contain a cycle.");
    visiting.add(item.id);
    const parent = item.parent_id ? byId.get(item.parent_id) : null;
    if (item.parent_id && !parent) throw Error("A routine item refers to a missing parent.");
    if (parent && parent.routine_id !== item.routine_id) throw Error("Routine items cannot cross routines.");
    const included = (!parent || includes(parent)) && (!item.frequency_rule || ruleMatches(item.frequency_rule, date, anchor));
    visiting.delete(item.id);
    applicable.set(item.id, included);
    return included;
  }
  return items.filter(includes).sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
}
export function validateChildIntersection(parentRules: RoutineRule[], childRule: RoutineRule, anchor: string, endDate: string | null): string | null {
  const allRules = [...parentRules, childRule];
  const weekdayRules = allRules.filter((rule): rule is Extract<RoutineRule, { type: "WEEKDAYS" }> => rule.type === "WEEKDAYS");
  if (weekdayRules.length > 1 && !weekdayRules[0].weekdays.some(day => weekdayRules.every(rule => rule.weekdays.includes(day)))) return "This item never falls on a day allowed by its parent schedule.";
  const fixedWeekday = allRules.some(rule => rule.type === "INTERVAL_WEEKS" || (rule.type === "INTERVAL_DAYS" && rule.interval % 7 === 0));
  if (fixedWeekday && weekdayRules.some(rule => !rule.weekdays.includes(weekday(anchor)))) return "This item never falls on the weekday fixed by its interval schedule.";
  if (endDate) {
    for (let day = dayNumber(anchor); day <= dayNumber(endDate); day++) {
      const date = dateFromDay(day);
      if ([...parentRules, childRule].every(rule => ruleMatches(rule, date, anchor))) return null;
    }
    return "This item never falls on a scheduled routine day before the end date.";
  }
  return null;
}
export function occurrenceDates(routine: RoutineDefinition, from: string, to: string, pauses: RoutinePause[] = []) {
  const dates: string[] = [];
  for (let day = dayNumber(from); day <= dayNumber(to); day++) {
    const date = dateFromDay(day);
    if (routineRunsOn(routine, date, pauses)) dates.push(date);
  }
  return dates;
}
export function progress(items: ItemOccurrence[]) {
  const leaves = items.filter(item => item.type !== "GROUP");
  const required = leaves.filter(item => item.required);
  const done = required.filter(item => item.status === "DONE").length;
  const skipped = required.filter(item => item.status === "SKIPPED").length;
  return { done, total: required.length, skipped, optionalDone: leaves.filter(item => !item.required && item.status === "DONE").length, complete: done === required.length };
}
export function effectiveStatus(occurrence: RoutineOccurrence, items: ItemOccurrence[], today: string) {
  if (occurrence.status === "SKIPPED") return "SKIPPED" as const;
  if (progress(items).complete && occurrence.started_at) return "COMPLETED" as const;
  if (occurrence.planned_date < today) return occurrence.started_at ? "PARTIAL" as const : "MISSED" as const;
  return occurrence.started_at ? "IN_PROGRESS" as const : "SCHEDULED" as const;
}
export function localRoutineDate(timezone: string, instant = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}
export function nextRoutineDate(routine: RoutineDefinition, after: string, days = 366) {
  for (let offset = 1; offset <= days; offset++) {
    const date = shiftDate(after, offset);
    if (routineRunsOn(routine, date)) return date;
  }
  return null;
}
