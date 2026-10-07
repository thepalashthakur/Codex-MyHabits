import { appData } from "@/lib/data";
import { RoutineEditor } from "@/components/routine-editor";

export default async function NewRoutine() {
  const data = await appData();
  return <><header className="page-head"><div><p className="eyebrow">PLAN YOUR DAY</p><h1>New routine</h1><p className="subtle">Build a repeatable sequence of tasks and habits.</p></div></header><RoutineEditor habits={data.habits.filter(habit => !habit.is_archived).map(habit => ({ id: habit.id, name: habit.name }))} today={data.today} timezone={data.timezone}/></>;
}
