import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";

const userId = "11111111-1111-4111-8111-111111111111";
const routineId = "22222222-2222-4222-8222-222222222222";
const habitId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const habitItemId = "55555555-5555-4555-8555-555555555555";

test("routine SQL preserves history, deduplicates generation and habit check-ins, and scopes rescheduling", async () => {
  const db = new PGlite();
  const query = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
    (await db.query<T>(sql, params)).rows;

  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    `);
    for (const migration of [
      "20261003000000_habits.sql",
      "20261003010000_habit_schedule_history.sql",
      "20261007000000_habit_v2_foundations.sql",
      "20261008000000_routines.sql",
    ]) {
      // PGlite does not provide btree_gist. Production PostgreSQL runs the unmodified migrations.
      const sql = readFileSync(join(process.cwd(), "supabase/migrations", migration), "utf8")
        .replace("create extension if not exists btree_gist;", "")
        .replace(/^  exclude using gist .*$/gm, "  check (true)");
      await db.exec(sql);
    }
    await db.exec(`insert into auth.users values ('${userId}');`);
    await query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await query("insert into public.tracker_habits(id,user_id,name,type,tracking_type,schedule_type,start_date) values ($1,$2,'Brush teeth','GOOD','BOOLEAN','DAILY','2099-01-01')", [habitId, userId]);

    const routine = {
      name: "Morning", description: null, timezone: "Asia/Kolkata", rule: { type: "DAILY" },
      preferred_start_time: "07:00", start_date: "2099-01-01", end_date: null,
      is_paused: false, paused_from: null, is_archived: false,
    };
    const task = {
      id: taskId, parent_id: null, position: 0, type: "TASK", title: "Shower",
      instructions: null, estimated_minutes: null, required: true, frequency_rule: null,
      reference_provider: null, reference_id: null,
    };
    const habitItem = { ...task, id: habitItemId, position: 1, type: "HABIT_REF", title: "Brush teeth", reference_provider: "HABIT", reference_id: habitId };
    const items = [task, habitItem];
    const save = (nextItems = items) => query("select public.tracker_save_routine($1,$2,$3)", [routineId, JSON.stringify(routine), JSON.stringify(nextItems)]);
    const materialize = async (date: string) => (await query<{ id: string }>(
      "select public.tracker_materialize_routine($1,$2,$3) id", [routineId, date, JSON.stringify(items)],
    ))[0].id;

    await save();
    const first = await materialize("2099-01-01");
    expect(await materialize("2099-01-01")).toBe(first);
    expect((await query<{ count: number }>("select count(*)::integer count from public.tracker_routine_item_occurrences where occurrence_id=$1", [first]))[0].count).toBe(2);

    const steps = await query<{ id: string; type: string }>("select id,type from public.tracker_routine_item_occurrences where occurrence_id=$1", [first]);
    const habitStep = steps.find(step => step.type === "HABIT_REF")!.id;
    const taskStep = steps.find(step => step.type === "TASK")!.id;
    await query("select public.tracker_routine_action($1,'START')", [first]);
    await query("select public.tracker_set_routine_item($1,'DONE')", [habitStep]);
    await query("select public.tracker_set_routine_item($1,'DONE')", [habitStep]);
    expect((await query<{ count: number }>("select count(*)::integer count from public.tracker_habit_logs where habit_id=$1", [habitId]))[0].count).toBe(1);
    await query("select public.tracker_set_routine_item($1,'DONE')", [taskStep]);
    expect((await query<{ status: string }>("select status from public.tracker_routine_occurrences where id=$1", [first]))[0].status).toBe("COMPLETED");

    await save([{ ...task, title: "Shower and dress" }, habitItem]);
    expect((await query<{ title: string; source_item_id: string }>("select title,source_item_id from public.tracker_routine_item_occurrences where id=$1", [taskStep]))[0]).toMatchObject({ title: "Shower", source_item_id: taskId });
    await query("select public.tracker_edit_routine_item($1,'Future task',null,true,'FUTURE')", [taskStep]);
    const second = await materialize("2099-01-02");
    expect((await query<{ title: string }>("select title from public.tracker_routine_item_occurrences where occurrence_id=$1 and type='TASK'", [second]))[0].title).toBe("Future task");

    await query("select public.tracker_routine_action($1,'RESCHEDULE',$2,'THIS')", [second, "2099-01-03"]);
    expect((await query<{ scheduled_date: string; planned_date: string }>("select scheduled_date::text,planned_date::text from public.tracker_routine_occurrences where id=$1", [second]))[0]).toMatchObject({ scheduled_date: "2099-01-02", planned_date: "2099-01-03" });
    await query("select public.tracker_routine_action($1,'RESCHEDULE',$2,'FUTURE')", [second, "2099-01-04"]);
    expect((await query<{ planned_offset_days: number; start_date: string }>("select planned_offset_days,start_date::text from public.tracker_routines where id=$1", [routineId]))[0]).toMatchObject({ planned_offset_days: 2, start_date: "2099-01-01" });

    await query("select public.tracker_set_routine_item($1,'PENDING')", [habitStep]);
    expect((await query<{ count: number }>("select count(*)::integer count from public.tracker_habit_logs where habit_id=$1", [habitId]))[0].count).toBe(0);
    expect((await query<{ status: string }>("select status from public.tracker_routine_occurrences where id=$1", [first]))[0].status).toBe("IN_PROGRESS");

    // An unrelated existing check-in is reused and survives undo.
    await query("insert into public.tracker_habit_logs(habit_id,user_id,date,status) values ($1,$2,'2099-01-05','COMPLETED')", [habitId, userId]);
    const third = await materialize("2099-01-03");
    const thirdHabitStep = (await query<{ id: string }>("select id from public.tracker_routine_item_occurrences where occurrence_id=$1 and type='HABIT_REF'", [third]))[0].id;
    await query("select public.tracker_set_routine_item($1,'DONE')", [thirdHabitStep]);
    await query("select public.tracker_set_routine_item($1,'PENDING')", [thirdHabitStep]);
    expect((await query<{ count: number }>("select count(*)::integer count from public.tracker_habit_logs where habit_id=$1 and date='2099-01-05'", [habitId]))[0].count).toBe(1);

    await query("select public.tracker_routine_lifecycle($1,'PAUSE')", [routineId]);
    expect((await query<{ is_paused: boolean }>("select is_paused from public.tracker_routines where id=$1", [routineId]))[0].is_paused).toBe(true);
    await expect(materialize("2099-01-04")).rejects.toThrow("Routine is not scheduled");
    await query("select public.tracker_routine_lifecycle($1,'RESUME')", [routineId]);
    expect((await query<{ is_paused: boolean }>("select is_paused from public.tracker_routines where id=$1", [routineId]))[0].is_paused).toBe(false);

    const pastRoutineId = "66666666-6666-4666-8666-666666666666";
    const pastItemId = "77777777-7777-4777-8777-777777777777";
    await query("select public.tracker_save_routine($1,$2,$3)", [
      pastRoutineId, JSON.stringify({ ...routine, start_date: "2020-01-01" }),
      JSON.stringify([{ ...task, id: pastItemId }]),
    ]);
    const missed = (await query<{ id: string }>("select public.tracker_materialize_routine($1,$2,$3) id", [pastRoutineId, "2020-01-02", JSON.stringify([{ id: pastItemId, parent_id: null }])]))[0].id;
    await query("select public.tracker_close_routine_occurrences()");
    expect((await query<{ status: string }>("select status from public.tracker_routine_occurrences where id=$1", [missed]))[0].status).toBe("MISSED");
    await expect(query("select public.tracker_routine_action($1,'START')", [missed])).rejects.toThrow("window has closed");
  } finally {
    await db.close();
  }
});
