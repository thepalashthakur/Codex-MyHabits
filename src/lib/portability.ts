import { z } from "zod";
import { habitInput } from "./validation";

const uuid = z.uuid();
const date = z.iso.date();
const portableArea = z.object({ id: uuid, name: z.string().trim().min(1).max(80), color: z.string().nullable().optional(), icon: z.string().nullable().optional(), position: z.number().int().min(0).optional() });
const portableHabit = z.intersection(z.object({ id: uuid, is_archived: z.boolean().optional(), archived_date: date.nullable().optional() }), habitInput);
const portableLog = z.object({ habit_id: uuid, date, status: z.enum(["COMPLETED", "FAILED", "SKIPPED"]), value: z.number().min(0).nullable().optional(), reason: z.string().max(120).nullable().optional() });
const portableNote = z.object({ habit_id: uuid, date: date.nullable().optional(), content: z.string().trim().min(1).max(4000) });
const portableReminder = z.object({ habit_id: uuid, time: z.string().min(1).max(30), timezone: z.string().min(1).max(80), enabled: z.boolean() });
const portablePause = z.object({ habit_id: uuid, start_date: date, end_date: date.nullable().optional(), reason: z.string().max(80).nullable().optional(), note: z.string().max(500).nullable().optional() }).refine(value => !value.end_date || value.end_date >= value.start_date);
const portableRelationship = z.object({ source_habit_id: uuid, target_habit_id: uuid, type: z.literal("AFTER") }).refine(value => value.source_habit_id !== value.target_habit_id);
const portableVersion = z.object({ habit_id: uuid, effective_date: date, type: z.enum(["GOOD", "BAD"]), tracking_type: z.enum(["BOOLEAN", "MEASURABLE"]), goal_value: z.number().nullable(), unit: z.string().nullable(), schedule_type: z.enum(["DAILY", "WEEKDAYS", "WEEKLY_TARGET", "MONTHLY_TARGET", "INTERVAL"]), schedule_config: z.record(z.string(), z.unknown()), start_date: date, end_date: date.nullable(), is_archived: z.boolean(), name: z.string().nullable().optional(), area_id: uuid.nullable().optional(), time_of_day: z.enum(["MORNING", "AFTERNOON", "EVENING", "ANYTIME"]).optional(), priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(), difficulty: z.enum(["EASY", "MODERATE", "HARD"]).nullable().optional(), minimum_goal_value: z.number().nullable().optional(), stretch_goal_value: z.number().nullable().optional() });

export const importSchema = z.object({
  format: z.literal("myhabits-v2"), version: z.literal(2), exportedAt: z.iso.datetime().optional(),
  areas: z.array(portableArea).max(1000), habits: z.array(portableHabit).max(5000),
  logs: z.array(portableLog).max(100000), notes: z.array(portableNote).max(50000),
  reminders: z.array(portableReminder).max(5000), pauses: z.array(portablePause).max(10000),
  relationships: z.array(portableRelationship).max(10000), versions: z.array(portableVersion).max(50000),
}).strict().superRefine((data, context) => {
  const unique = (values: string[], name: string) => {
    if (new Set(values).size !== values.length) context.addIssue({ code: "custom", message: `Duplicate ${name} in import.` });
  };
  unique(data.areas.map(area => area.id), "area IDs");
  unique(data.habits.map(habit => habit.id), "habit IDs");
  unique(data.logs.map(log => `${log.habit_id}:${log.date}`), "habit dates");
  unique(data.versions.map(version => `${version.habit_id}:${version.effective_date}`), "schedule versions");
  unique(data.relationships.map(link => `${link.source_habit_id}:${link.target_habit_id}`), "relationships");
  const areaIds = new Set(data.areas.map(area => area.id));
  const habitIds = new Set(data.habits.map(habit => habit.id));
  for (const habit of data.habits) if (habit.area_id && !areaIds.has(habit.area_id)) context.addIssue({ code: "custom", message: `Habit ${habit.name} references a missing area.` });
  for (const collection of [data.logs, data.notes, data.reminders, data.pauses, data.versions]) for (const item of collection) if (!habitIds.has(item.habit_id)) context.addIssue({ code: "custom", message: "Import references a missing habit." });
  for (const link of data.relationships) if (!habitIds.has(link.source_habit_id) || !habitIds.has(link.target_habit_id)) context.addIssue({ code: "custom", message: "Relationship references a missing habit." });
  const pauses = new Map<string, typeof data.pauses>();
  for (const pause of data.pauses) pauses.set(pause.habit_id, [...(pauses.get(pause.habit_id) ?? []), pause]);
  for (const entries of pauses.values()) {
    entries.sort((a, b) => a.start_date.localeCompare(b.start_date));
    for (let index = 1; index < entries.length; index++) if (!entries[index - 1].end_date || entries[index].start_date <= entries[index - 1].end_date!) context.addIssue({ code: "custom", message: "Import contains overlapping pauses." });
  }
  const edges = new Map<string, string[]>();
  for (const link of data.relationships) edges.set(link.source_habit_id, [...(edges.get(link.source_habit_id) ?? []), link.target_habit_id]);
  const visited = new Set<string>();
  const active = new Set<string>();
  const cycle = (id: string): boolean => {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id); active.add(id);
    for (const next of edges.get(id) ?? []) if (cycle(next)) return true;
    active.delete(id);
    return false;
  };
  if ([...habitIds].some(id => cycle(id))) context.addIssue({ code: "custom", message: "Import contains a routine loop." });
});

export type ImportPackage = z.infer<typeof importSchema>;
export type ImportMode = "skip" | "copy";

export function csvText(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (value: unknown) => {
    const raw = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return `${columns.map(cell).join(",")}\n${rows.map(row => columns.map(column => cell(row[column])).join(",")).join("\n")}`;
}
