import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { appData } from "@/lib/data";
import { monthStart, shiftDate } from "@/lib/domain";
import { materializeRoutine, routineDefinitions } from "@/lib/routine-data";
import { effectiveStatus, localRoutineDate, occurrenceDates, progress, type ItemOccurrence, type RoutineOccurrence } from "@/lib/routines";

export default async function RoutineHistory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  const data = await appData();
  const { id } = await params;
  const definitions = await routineDefinitions(data.client, data.user.id);
  const routine = definitions.routines.find(value => value.id === id);
  if (!routine) notFound();
  const today = localRoutineDate(routine.timezone);
  const requested = (await searchParams).month;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : today.slice(0, 7);
  const from = `${month}-01`;
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const to = `${month}-${String(last).padStart(2, "0")}`;
  const scheduledFrom = shiftDate(from, -routine.planned_offset_days);
  const scheduledTo = shiftDate(to < today ? to : today, -routine.planned_offset_days);
  const scheduled = occurrenceDates(routine, scheduledFrom, scheduledTo, definitions.pauses);
  const ownItems = definitions.items.filter(item => item.routine_id === id);
  await Promise.all(scheduled.map(date => materializeRoutine(data.client, routine, ownItems, date, data.habits, data.versions, data.pauses, definitions.pauses)));
  const { error: closeError } = await data.client.rpc("tracker_close_routine_occurrences");
  if (closeError) throw Error("Unable to update routine history.");
  const { data: occurrences, error } = await data.client.from("tracker_routine_occurrences").select("*").eq("routine_id", id).eq("user_id", data.user.id).gte("planned_date", from).lte("planned_date", to).order("planned_date", { ascending: false });
  if (error) throw Error("Unable to load routine history.");
  const rows = (occurrences ?? []) as RoutineOccurrence[];
  const { data: steps, error: stepsError } = rows.length ? await data.client.from("tracker_routine_item_occurrences").select("*").eq("user_id", data.user.id).in("occurrence_id", rows.map(row => row.id)) : { data: [], error: null };
  if (stepsError) throw Error("Unable to load routine progress.");
  const previous = monthStart(shiftDate(from, -1)).slice(0, 7), next = monthStart(shiftDate(to, 1)).slice(0, 7);
  return <><header className="page-head"><div><p className="eyebrow">ROUTINE HISTORY</p><h1>{routine.name}</h1><p className="subtle">Completed, partial, skipped and missed occurrences in {routine.timezone}.</p></div><Link className="button" href={`/routines/${id}`}>Routine details</Link></header><nav className="actions" aria-label="Choose history month"><Link className="button small" href={`/routines/${id}/history?month=${previous}`} aria-label="Previous month">←</Link><span className="pill">{month}</span><Link className="button small" href={`/routines/${id}/history?month=${next}`} aria-label="Next month">→</Link></nav>{rows.length ? <Stack spacing={1.5} sx={{ mt: 2 }}>{rows.map(occurrence => {
    const items = (steps as ItemOccurrence[]).filter(item => item.occurrence_id === occurrence.id);
    const summary = progress(items);
    return <Card key={occurrence.id} variant="outlined" sx={{ p: 2 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}><div><Typography component={Link} href={`/routine-occurrences/${occurrence.id}`} variant="subtitle1" sx={{ color: "text.primary" }}>{occurrence.planned_date}</Typography><Typography variant="body2" color="text.secondary">{effectiveStatus(occurrence, items, today).toLowerCase().replaceAll("_", " ")} · {summary.done} of {summary.total} required steps done{summary.skipped ? ` · ${summary.skipped} skipped` : ""}</Typography></div><Link className="button small" href={`/routine-occurrences/${occurrence.id}`}>View</Link></Stack></Card>;
  })}</Stack> : <div className="card empty"><h2>No occurrences this month</h2><p>Choose another month or adjust the routine schedule.</p></div>}</>;
}
