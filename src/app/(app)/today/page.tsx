import Link from "next/link";
import { appData, logsBetween } from "@/lib/data";
import { getScheduledHabits, logAchievesGoal, shiftDate, type TimeOfDay } from "@/lib/domain";
import { CheckIn } from "@/components/check-in";

const groups: { id: TimeOfDay; label: string }[] = [
  { id: "MORNING", label: "Morning" }, { id: "AFTERNOON", label: "Afternoon" },
  { id: "EVENING", label: "Evening" }, { id: "ANYTIME", label: "Anytime" },
];

export default async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const data = await appData();
  const requested = (await searchParams).date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : data.today;
  const habits = getScheduledHabits(data.habits, date, data.versions, data.pauses);
  const logs = await logsBetween(data.user.id, data.client, date, date);
  const byHabit = new Map(logs.map(log => [log.habit_id, log]));
  const complete = habits.filter(habit => logAchievesGoal(habit, byHabit.get(habit.id))).length;
  const partial = habits.filter(habit => { const log = byHabit.get(habit.id); return log?.status === "COMPLETED" && !logAchievesGoal(habit, log); }).length;
  const percent = habits.length ? Math.round(complete / habits.length * 100) : 0;
  const title = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return <>
    <header className="page-head today-head"><div><p className="eyebrow">YOUR DAY</p><h1>{date === data.today ? "Today" : title}</h1><p className="subtle">{title}</p></div><Link className="button primary" href="/habits/new">+ Add habit</Link></header>
    <section className="daily-summary" aria-label="Daily progress"><div className="row"><div><strong>{complete} of {habits.length} complete</strong><p className="subtle">{partial ? `${partial} in progress · ` : ""}{habits.length - complete - partial} remaining</p></div><strong className="daily-percent">{percent}%</strong></div><progress value={complete} max={habits.length || 1} aria-label={`${complete} of ${habits.length} scheduled habits completed`}/><p className="daily-rule">Only scheduled habits count. Partial, failed and skipped habits remain incomplete; paused and unscheduled habits are excluded.</p></section>
    <nav className="actions day-navigation" aria-label="Choose day"><Link className="button small" href={`/today?date=${shiftDate(date, -1)}`}>← Previous</Link>{date !== data.today && <Link className="button small" href="/today">Today</Link>}<Link className="button small" href={`/today?date=${shiftDate(date, 1)}`}>Next →</Link></nav>
    {habits.length ? groups.map(group => {
      const items = habits.filter(habit => (habit.time_of_day ?? "ANYTIME") === group.id);
      if (!items.length) return null;
      const done = items.filter(habit => logAchievesGoal(habit, byHabit.get(habit.id))).length;
      return <section className="today-group" key={group.id} aria-labelledby={`group-${group.id}`}><div className="today-group-head"><h2 id={`group-${group.id}`}>{group.label}</h2><span>{done}/{items.length}</span></div><div className="today-list">{items.map(habit => {
        const log = byHabit.get(habit.id);
        const status = logAchievesGoal(habit, log) ? "Complete" : log?.status === "COMPLETED" ? "In progress" : log?.status === "FAILED" ? "Failed" : log?.status === "SKIPPED" ? "Skipped" : "Remaining";
        return <article className="today-habit" key={habit.id}><div className="today-habit-label"><span className="habit-icon" aria-hidden="true">{habit.icon || "✓"}</span><div><Link className="habit-title" href={`/habits/${habit.id}`}>{habit.name}</Link><div className="habit-meta">{status}{habit.tracking_type === "MEASURABLE" ? ` · ${Number(log?.value ?? 0)} / ${habit.goal_value} ${habit.unit}` : ""}</div></div></div><CheckIn habit={habit} date={date} initial={log}/></article>;
      })}</div></section>;
    }) : <div className="card empty"><h2>Nothing scheduled today</h2><p>Enjoy the open day, or add a habit when you’re ready.</p><Link className="button primary" href="/habits/new">Create habit</Link></div>}
  </>;
}
