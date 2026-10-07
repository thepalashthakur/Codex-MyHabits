import { z } from "zod";
import { dateSchema } from "./validation";
import { validateChildIntersection, type RoutineRule } from "./routines";

export const ruleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DAILY") }).strict(),
  z.object({ type: z.literal("WEEKDAYS"), weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(days => new Set(days).size === days.length) }).strict(),
  z.object({ type: z.literal("INTERVAL_DAYS"), interval: z.number().int().min(1).max(365) }).strict(),
  z.object({ type: z.literal("INTERVAL_WEEKS"), interval: z.number().int().min(1).max(52) }).strict(),
  z.object({ type: z.literal("MONTH_DATES"), dates: z.array(z.number().int().min(1).max(31)).min(1).max(31).refine(days => new Set(days).size === days.length), missing: z.enum(["SKIP", "LAST_DAY"]) }).strict(),
]);
const timezone = z.string().min(1).max(80).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Choose a valid timezone.");
const routineDefinition = z.object({
  name: z.string().trim().min(1).max(120), description: z.string().max(2000).nullable(), timezone,
  rule: ruleSchema, preferred_start_time: z.iso.time().nullable(), start_date: dateSchema,
  end_date: dateSchema.nullable(), is_paused: z.boolean(), paused_from: dateSchema.nullable(), is_archived: z.boolean(),
}).strict().refine(value => !value.end_date || value.end_date >= value.start_date, "End date must follow start date.")
  .refine(value => !value.is_paused || Boolean(value.paused_from), "Paused routines need a pause date.");
const itemDefinition = z.object({
  id: z.uuid(), parent_id: z.uuid().nullable(), position: z.number().int().min(0).max(10000),
  type: z.enum(["GROUP", "TASK", "HABIT_REF"]), title: z.string().trim().min(1).max(120),
  instructions: z.string().max(2000).nullable(), estimated_minutes: z.number().int().min(1).max(1440).nullable(),
  required: z.boolean(), frequency_rule: ruleSchema.nullable(),
  reference_provider: z.literal("HABIT").nullable(), reference_id: z.uuid().nullable(),
}).strict().refine(value => value.type === "HABIT_REF" ? value.reference_provider === "HABIT" && Boolean(value.reference_id) : !value.reference_provider && !value.reference_id, "Choose an existing habit for habit steps.");

export const routineInput = z.object({ routine: routineDefinition, items: z.array(itemDefinition).max(500) }).strict().superRefine((value, context) => {
  if (!value.items.some(item => item.type !== "GROUP")) context.addIssue({ code: "custom", message: "Add at least one task or habit step." });
  const byId = new Map(value.items.map(item => [item.id, item]));
  if (byId.size !== value.items.length) context.addIssue({ code: "custom", message: "Routine item IDs must be unique." });
  const visiting = new Set<string>();
  const rulePaths = new Map<string, RoutineRule[]>();
  function check(id: string): RoutineRule[] {
    const item = byId.get(id);
    if (!item || visiting.has(id)) { context.addIssue({ code: "custom", message: "Routine items cannot contain a cycle or missing parent." }); return [value.routine.rule]; }
    const cached = rulePaths.get(id);
    if (cached) return cached;
    visiting.add(id);
    const parent = item.parent_id ? byId.get(item.parent_id) : null;
    if (item.parent_id && (!parent || parent.type !== "GROUP")) context.addIssue({ code: "custom", message: "A routine item must belong to a group in this routine." });
    const parentRules = parent ? check(parent.id) : [value.routine.rule];
    if (item.frequency_rule) {
      const issue = validateChildIntersection(parentRules, item.frequency_rule, value.routine.start_date, value.routine.end_date);
      if (issue) context.addIssue({ code: "custom", message: `${item.title}: ${issue}` });
    }
    visiting.delete(id);
    const path = item.frequency_rule ? [...parentRules, item.frequency_rule] : parentRules;
    rulePaths.set(id, path);
    return path;
  }
  for (const item of value.items) check(item.id);
});
export type RoutineInput = z.infer<typeof routineInput>;
