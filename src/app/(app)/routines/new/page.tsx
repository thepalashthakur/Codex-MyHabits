import { appData } from "@/lib/data";
import Alert from "@mui/material/Alert";
import { RoutineEditor } from "@/components/routine-editor";
import { routineDefinitions } from "@/lib/routine-data";

export default async function NewRoutine() {
  const data = await appData();
  const definitions = await routineDefinitions(data.client, data.user.id);
  if (!definitions.available) return <><header className="page-head"><div><p className="eyebrow">PLAN YOUR DAY</p><h1>New routine</h1></div></header><Alert severity="info">Routines are temporarily unavailable while setup is completed. Please try again later.</Alert></>;
  return <><header className="page-head"><div><p className="eyebrow">PLAN YOUR DAY</p><h1>New routine</h1><p className="subtle">Build a repeatable sequence of tasks and habits.</p></div></header><RoutineEditor habits={data.habits.filter(habit => !habit.is_archived).map(habit => ({ id: habit.id, name: habit.name }))} today={data.today} timezone={data.timezone}/></>;
}
