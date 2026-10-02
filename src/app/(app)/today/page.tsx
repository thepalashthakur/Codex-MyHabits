import Link from "next/link";
import { appData, logsBetween } from "@/lib/data";
import { getScheduledHabits, logAchievesGoal, shiftDate } from "@/lib/domain";
import { CheckIn } from "@/components/check-in";
export default async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const data = await appData(); const requested = (await searchParams).date; const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : data.today;
  const habits = getScheduledHabits(data.habits, date); const logs = await logsBetween(data.user.id, data.client, date, date); const byHabit = new Map(logs.map(log => [log.habit_id, log]));
  const complete = habits.filter(h => logAchievesGoal(h, byHabit.get(h.id))).length;
  const areaNames = new Map(data.areas.map(a => [a.id, a.name]));
  return <><header className="page-head"><div><p className="eyebrow">DAILY CHECK-IN</p><h1>{date === data.today ? "Today" : date}</h1><p className="subtle">{date === data.today ? new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)) : "Review your habits for this day"}</p></div><Link className="button primary" href="/habits/new">+ New habit</Link></header>
  <div className="grid"><div className="card stat"><div className="value">{complete}/{habits.length}</div><div className="label">completed</div></div><div className="card stat"><div className="value">{habits.length ? Math.round(complete / habits.length * 100) : 0}%</div><div className="label">daily progress</div></div><div className="card stat"><div className="value">{data.habits.filter(h => !h.is_archived).length}</div><div className="label">active habits</div></div></div>
  <div className="row"><h2 className="section-title">Scheduled habits</h2><div className="actions"><Link className="button small" href={`/today?date=${shiftDate(date, -1)}`}>← Previous</Link>{date !== data.today && <Link className="button small" href="/today">Today</Link>}<Link className="button small" href={`/today?date=${shiftDate(date, 1)}`}>Next →</Link></div></div>
  {habits.length ? <div className="list">{habits.map(h => <div className="card habit-row" key={h.id}><div className="habit-main"><span className="habit-icon" aria-hidden="true">{h.icon || "✓"}</span><div><Link className="habit-title" href={`/habits/${h.id}`}>{h.name}</Link><div className="habit-meta">{h.area_id ? areaNames.get(h.area_id) ?? "Uncategorized" : "Uncategorized"}{h.tracking_type === "MEASURABLE" ? ` · Goal ${h.goal_value} ${h.unit}` : ""}</div></div></div><CheckIn habit={h} date={date} initial={byHabit.get(h.id)}/></div>)}</div> : <div className="card empty"><h2>No habits scheduled</h2><p>Create a habit or choose another day.</p><Link className="button primary" href="/habits/new">Create habit</Link></div>}
  </>;
}
