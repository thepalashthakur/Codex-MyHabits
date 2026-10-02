import Link from "next/link";
import { appData } from "@/lib/data";
import { HabitForm } from "@/components/habit-form";
export default async function NewHabit() { const data = await appData(); return <><header className="page-head"><div><p className="eyebrow">HABITS</p><h1>New habit</h1><p className="subtle">Start simple. You can adjust the details later.</p></div><Link className="button" href="/habits">Cancel</Link></header><HabitForm areas={data.areas} today={data.today}/></>; }
