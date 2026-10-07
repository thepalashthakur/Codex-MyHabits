import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { appData } from "@/lib/data";
import { shiftDate } from "@/lib/domain";
import { materializeRoutine, parentFirst, routineDefinitions } from "@/lib/routine-data";
import { localRoutineDate, nextRoutineDate, routineRunsOn, type RoutineOccurrence } from "@/lib/routines";
import { RoutineActions } from "@/components/routine-actions";

export default async function RoutineDetail({ params }: { params: Promise<{ id: string }> }) {
  const data = await appData();
  const { id } = await params;
  const definitions = await routineDefinitions(data.client, data.user.id);
  const routine = definitions.routines.find(value => value.id === id);
  if (!routine) notFound();
  const items = definitions.items.filter(item => item.routine_id === id);
  const localToday = localRoutineDate(routine.timezone);
  const scheduledDate = shiftDate(localToday, -routine.planned_offset_days);
  if (routineRunsOn(routine, scheduledDate, definitions.pauses)) await materializeRoutine(data.client, routine, items, scheduledDate, data.habits, data.versions, data.pauses, definitions.pauses);
  const { error: closeError } = await data.client.rpc("tracker_close_routine_occurrences");
  if (closeError) throw Error("Unable to update routine history.");
  const { data: occurrences, error } = await data.client.from("tracker_routine_occurrences").select("*").eq("routine_id", id).eq("user_id", data.user.id).order("planned_date", { ascending: false }).limit(20);
  if (error) throw Error("Unable to load routine history.");
  const todayOccurrence = (occurrences as RoutineOccurrence[]).find(value => value.planned_date === localToday);
  const next = nextRoutineDate(routine, shiftDate(localToday, -1));
  return <><header className="page-head"><div><p className="eyebrow">ROUTINE</p><h1>{routine.name}</h1><p className="subtle">{routine.description || "A repeatable part of your day."}</p></div><Stack direction="row" spacing={1}><Link className="button" href={`/routines/${id}/edit`}>Edit routine</Link><Link className="button" href={`/routines/${id}/history`}>History</Link></Stack></header>
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={1.5}><Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}><Chip label={routine.is_archived ? "Archived" : routine.is_paused ? "Paused" : "Active"}/><Chip variant="outlined" label={routine.timezone}/>{routine.preferred_start_time && <Chip variant="outlined" label={`Around ${routine.preferred_start_time.slice(0, 5)}`}/>}</Stack><Typography variant="body2" color="text.secondary">{items.filter(item => item.type !== "GROUP").length} steps · {next ? `Next scheduled ${next}` : "No upcoming date"}</Typography><RoutineActions id={id} paused={routine.is_paused} archived={routine.is_archived}/>{todayOccurrence && <Link className="button primary" href={`/routine-occurrences/${todayOccurrence.id}`}>Open today’s occurrence</Link>}</Stack></Card>
    <section><h2 className="section-title">Template</h2><Card variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>{parentFirst(items).map(item => <Typography key={item.id} variant="body2" sx={{ pl: item.parent_id ? 3 : 0 }}>{item.type === "GROUP" ? "▸ " : "• "}{item.title}{item.type === "HABIT_REF" ? " · habit" : ""}{item.required && item.type !== "GROUP" ? " · required" : ""}</Typography>)}</Stack></Card></section>
    <section><h2 className="section-title">Recent occurrences</h2>{occurrences?.length ? <Stack spacing={1}>{(occurrences as RoutineOccurrence[]).map(occurrence => <Card key={occurrence.id} variant="outlined" sx={{ p: 2 }}><Link href={`/routine-occurrences/${occurrence.id}`}>{occurrence.planned_date}</Link><Typography variant="body2" color="text.secondary">{occurrence.status.toLowerCase().replaceAll("_", " ")}</Typography></Card>)}</Stack> : <div className="card empty"><p>No occurrences yet. They are created when scheduled dates are opened.</p></div>}</section>
  </>;
}
