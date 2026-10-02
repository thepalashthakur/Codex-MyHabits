import Link from "next/link";
import { notFound } from "next/navigation";
import { appData } from "@/lib/data";
import { HabitForm } from "@/components/habit-form";
export default async function EditHabit({ params }: { params: Promise<{ habitId: string }> }) { const data = await appData(); const { habitId } = await params; const habit = data.habits.find(h => h.id === habitId); if (!habit) notFound(); return <><header className="page-head"><div><p className="eyebrow">HABITS</p><h1>Edit {habit.name}</h1></div><Link className="button" href={`/habits/${habit.id}`}>Cancel</Link></header><HabitForm habit={habit} areas={data.areas} today={data.today}/></>; }
