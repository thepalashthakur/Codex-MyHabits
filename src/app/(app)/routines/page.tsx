import Link from "next/link";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { appData } from "@/lib/data";
import { routineDefinitions } from "@/lib/routine-data";
import { localRoutineDate, nextRoutineDate, type RoutineRule } from "@/lib/routines";
import { shiftDate } from "@/lib/domain";
import { RoutineActions } from "@/components/routine-actions";

function description(rule: RoutineRule) {
  switch (rule.type) {
    case "DAILY": return "Every day";
    case "WEEKDAYS": return `Weekdays ${rule.weekdays.map(day => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")}`;
    case "INTERVAL_DAYS": return `Every ${rule.interval} days`;
    case "INTERVAL_WEEKS": return `Every ${rule.interval} weeks`;
    case "MONTH_DATES": return `Monthly on ${rule.dates.join(", ")}`;
  }
}
export default async function Routines() {
  const data = await appData();
  const { routines, items } = await routineDefinitions(data.client, data.user.id);
  const active = routines.filter(routine => !routine.is_archived);
  const archived = routines.filter(routine => routine.is_archived);
  return <><header className="page-head"><div><p className="eyebrow">REPEAT WHAT MATTERS</p><h1>Routines</h1><p className="subtle">Tasks and habits, arranged around your day.</p></div><Link className="button primary" href="/routines/new">Create routine</Link></header>
    {!active.length && <div className="card empty"><h2>No routines yet</h2><p>Build a repeatable checklist for a part of your day.</p><Link className="button primary" href="/routines/new">Create routine</Link></div>}
    <Stack spacing={1.5}>{active.map(routine => {
      const today = localRoutineDate(routine.timezone);
      const next = nextRoutineDate(routine, shiftDate(today, -1));
      const count = items.filter(item => item.routine_id === routine.id && item.type !== "GROUP").length;
      return <Card key={routine.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}><Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}><div><Typography variant="h6" component={Link} href={`/routines/${routine.id}`} sx={{ color: "text.primary", textDecoration: "none" }}>{routine.name}</Typography><Typography variant="body2" color="text.secondary">{routine.description || description(routine.rule)}</Typography><Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}><Chip size="small" label={routine.is_paused ? "Paused" : next ? `Next ${next}` : "No upcoming date"}/><Chip size="small" variant="outlined" label={`${count} steps`}/>{routine.preferred_start_time && <Chip size="small" variant="outlined" label={routine.preferred_start_time.slice(0, 5)}/>}</Stack></div><Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}><Link className="button small" href={`/routines/${routine.id}/edit`}>Edit</Link><RoutineActions id={routine.id} paused={routine.is_paused} archived={false}/></Stack></Stack></Card>;
    })}</Stack>
    {archived.length > 0 && <section><h2 className="section-title">Archived</h2><Stack spacing={1}>{archived.map(routine => <Card key={routine.id} variant="outlined" sx={{ p: 2 }}><Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center" }}><Link href={`/routines/${routine.id}`}>{routine.name}</Link><RoutineActions id={routine.id} paused={routine.is_paused} archived/></Stack></Card>)}</Stack></section>}
  </>;
}
