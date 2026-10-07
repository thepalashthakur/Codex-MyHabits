import { z } from "zod";
import { ApiError, withApi, type Context } from "@/lib/api";
import { csvText, importSchema } from "@/lib/portability";

const tableColumns = {
  areas: ["id", "name", "color", "icon", "position"],
  habits: ["id", "area_id", "name", "description", "type", "tracking_type", "goal_value", "unit", "schedule_type", "schedule_config", "start_date", "end_date", "color", "icon", "position", "is_archived", "archived_date", "time_of_day", "priority", "difficulty", "quick_increments", "minimum_goal_value", "stretch_goal_value"],
  logs: ["habit_id", "date", "status", "value", "reason"],
  notes: ["habit_id", "date", "content"],
  reminders: ["habit_id", "time", "timezone", "enabled"],
  pauses: ["habit_id", "start_date", "end_date", "reason", "note"],
  relationships: ["source_habit_id", "target_habit_id", "type"],
  versions: ["habit_id", "effective_date", "name", "area_id", "type", "tracking_type", "goal_value", "unit", "schedule_type", "schedule_config", "start_date", "end_date", "is_archived", "time_of_day", "priority", "difficulty", "minimum_goal_value", "stretch_goal_value"],
} as const;
type TableName = keyof typeof tableColumns;
const tableNames = Object.keys(tableColumns) as TableName[];
const tableName = (name: TableName) => `tracker_${name === "logs" ? "habit_logs" : name === "notes" ? "habit_notes" : name === "reminders" ? "habit_reminders" : name === "pauses" ? "habit_pauses" : name === "versions" ? "habit_schedule_versions" : name === "relationships" ? "habit_relationships" : name}`;

async function tableRows(context: Context, name: TableName) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const base = context.client.from(tableName(name)).select("*").eq("user_id", context.user.id);
    const query = name === "versions" ? base.order("habit_id").order("effective_date") : base.order("id");
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []).map(row => Object.fromEntries(tableColumns[name].map(column => [column, row[column]]))));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function GET(request: Request) {
  return withApi(request, async context => {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "csv") throw new ApiError(400, "Choose JSON or CSV.");
    const selected = url.searchParams.get("table");
    if (format === "csv") {
      if (!selected || !tableNames.includes(selected as TableName)) throw new ApiError(400, "Choose a CSV data type.");
      const name = selected as TableName;
      const rows = await tableRows(context, name);
      return new Response(csvText(rows, [...tableColumns[name]]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="myhabits-${name}.csv"`, "Cache-Control": "private, no-store" } });
    }
    const entries = await Promise.all(tableNames.map(async name => [name, await tableRows(context, name)] as const));
    const payload = { format: "myhabits-v2", version: 2, exportedAt: new Date().toISOString(), ...Object.fromEntries(entries) };
    return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=\"myhabits-v2.json\"", "Cache-Control": "private, no-store" } });
  });
}

async function boundedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Choose a JSON file.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 20_000_000) { await reader.cancel(); throw new ApiError(413, "Import file is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new ApiError(400, "Invalid JSON file."); }
}

const importRequest = z.object({ payload: importSchema, mode: z.enum(["skip", "copy"]), preview: z.boolean() }).strict();

export async function POST(request: Request) {
  return withApi(request, async context => {
    const input = importRequest.parse(await boundedJson(request));
    const [areas, habits] = await Promise.all([
      context.client.from("tracker_areas").select("name").eq("user_id", context.user.id),
      context.client.from("tracker_habits").select("name").eq("user_id", context.user.id),
    ]);
    if (areas.error || habits.error) throw Error("Unable to preview import.");
    const existingAreas = new Set((areas.data ?? []).map(area => area.name.toLocaleLowerCase()));
    const existingHabits = new Set((habits.data ?? []).map(habit => habit.name.toLocaleLowerCase()));
    const duplicates = input.payload.habits.filter(habit => existingHabits.has(habit.name.toLocaleLowerCase())).map(habit => habit.name);
    const preview = { areas: input.payload.areas.length, habits: input.payload.habits.length, logs: input.payload.logs.length, notes: input.payload.notes.length, reminders: input.payload.reminders.length, pauses: input.payload.pauses.length, relationships: input.payload.relationships.length, duplicateAreas: input.payload.areas.filter(area => existingAreas.has(area.name.toLocaleLowerCase())).length, duplicateHabits: duplicates };
    if (input.preview) return { preview };
    const { data, error } = await context.client.rpc("tracker_import_v2", { p_data: input.payload, p_mode: input.mode });
    if (error?.code === "22023") throw new ApiError(400, "The import format is invalid.");
    if (error?.code === "23505" || error?.code === "23P01" || error?.code === "23514") throw new ApiError(409, "The import contains conflicting or overlapping records. Review the file and try again.");
    if (error) throw error;
    return { result: data, preview };
  });
}
