import { notFound } from "next/navigation";
import { appData } from "@/lib/data";
import { routineDefinitions } from "@/lib/routine-data";
import { routineInput } from "@/lib/routine-validation";
import { RoutineEditor } from "@/components/routine-editor";

export default async function EditRoutine({ params }: { params: Promise<{ id: string }> }) {
  const data = await appData();
  const { id } = await params;
  const definitions = await routineDefinitions(data.client, data.user.id);
  const routine = definitions.routines.find(value => value.id === id);
  if (!routine) notFound();
  const items = definitions.items.filter(item => item.routine_id === id);
  const initial = routineInput.parse({
    routine: { name: routine.name, description: routine.description, timezone: routine.timezone, rule: routine.rule, preferred_start_time: routine.preferred_start_time, start_date: routine.start_date, end_date: routine.end_date, is_paused: routine.is_paused, paused_from: routine.paused_from, is_archived: routine.is_archived },
    items: items.map(item => ({ id: item.id, parent_id: item.parent_id, position: item.position, type: item.type, title: item.title, instructions: item.instructions, estimated_minutes: item.estimated_minutes, required: item.required, frequency_rule: item.frequency_rule, reference_provider: item.reference_provider, reference_id: item.reference_id })),
  });
  return <><header className="page-head"><div><p className="eyebrow">ROUTINE TEMPLATE</p><h1>Edit {routine.name}</h1><p className="subtle">Changes apply to future unstarted occurrences. Started and completed checklists keep their snapshots.</p></div></header><RoutineEditor id={id} initial={initial} habits={data.habits.filter(habit => !habit.is_archived || items.some(item => item.reference_id === habit.id)).map(habit => ({ id: habit.id, name: habit.name }))} today={data.today} timezone={routine.timezone}/></>;
}
