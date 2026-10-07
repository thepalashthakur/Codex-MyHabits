import Link from "next/link";
import { notFound } from "next/navigation";
import { appData } from "@/lib/data";
import { occurrenceWithItems } from "@/lib/routine-data";
import { RoutineRun } from "@/components/routine-run";

export default async function RoutineOccurrencePage({ params }: { params: Promise<{ id: string }> }) {
  const data = await appData();
  const { id } = await params;
  const { error } = await data.client.rpc("tracker_close_routine_occurrences");
  if (error) throw Error("Unable to update routine history.");
  const result = await occurrenceWithItems(data.client, data.user.id, id);
  if (!result) notFound();
  const { data: routine, error: routineError } = await data.client.from("tracker_routines").select("name").eq("id", result.occurrence.routine_id).eq("user_id", data.user.id).single();
  if (routineError) throw Error("Unable to load routine.");
  return <><header className="page-head"><div><p className="eyebrow">ROUTINE OCCURRENCE</p><h1>{routine.name}</h1><p className="subtle">Work through the steps in any order.</p></div><Link className="button" href={`/routines/${result.occurrence.routine_id}`}>Routine details</Link></header><RoutineRun initialOccurrence={result.occurrence} initialItems={result.items} routineName={routine.name}/></>;
}
