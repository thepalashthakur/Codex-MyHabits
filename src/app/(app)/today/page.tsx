import Link from "next/link";
import Alert from "@mui/material/Alert";
import { appData, logsBetween } from "@/lib/data";
import { getPeriodTargetProgress, getScheduledHabits, logAchievesGoal, monthStart, shiftDate, weekStart, type Habit, type TimeOfDay } from "@/lib/domain";
import { CheckIn } from "@/components/check-in";
import { routineDefinitions, routinesForToday } from "@/lib/routine-data";
import { effectiveStatus, localRoutineDate, progress, type ItemOccurrence } from "@/lib/routines";

const groups: { id: TimeOfDay; label: string }[] = [
  { id: "MORNING", label: "Morning" }, { id: "AFTERNOON", label: "Afternoon" },
  { id: "EVENING", label: "Evening" }, { id: "ANYTIME", label: "Anytime" },
];

export default async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const data = await appData();
  const requested = (await searchParams).date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : data.today;
  const definitions = await routineDefinitions(data.client, data.user.id);
  if (definitions.available) {
    const { error: closeError } = await data.client.rpc("tracker_close_routine_occurrences");
    if (closeError) throw Error("Unable to update routine history.");
  }
  const routineOccurrences = definitions.available
    ? await routinesForToday(data.client, data.user.id, definitions.routines, definitions.items, data.habits, data.versions, data.pauses, definitions.pauses, date === data.today ? undefined : date)
    : [];
  const { data: routineSteps, error: routineStepsError } = routineOccurrences.length
    ? await data.client.from("tracker_routine_item_occurrences").select("*").eq("user_id", data.user.id).in("occurrence_id", routineOccurrences.map(occurrence => occurrence.id))
    : { data: [], error: null };
  if (routineStepsError) throw Error("Unable to load routine progress.");
  const habits = getScheduledHabits(data.habits, date, data.versions, data.pauses);
  const logs = await logsBetween(data.user.id, data.client, weekStart(date) < monthStart(date) ? weekStart(date) : monthStart(date), date);
  const byHabit = new Map(logs.filter(log => log.date === date).map(log => [log.habit_id, log]));
  const periodProgress = (habit: Habit) => getPeriodTargetProgress(habit, logs, date, data.versions, data.pauses);
  const achieved = (habit: Habit) => periodProgress(habit)?.achieved ?? logAchievesGoal(habit, byHabit.get(habit.id));
  const inProgress = (habit: Habit) => { const log = byHabit.get(habit.id); const progress = periodProgress(habit); return progress ? progress.count > 0 && !progress.achieved : log?.status === "COMPLETED" && !achieved(habit); };
  const complete = habits.filter(achieved).length;
  const partial = habits.filter(inProgress).length;
  const percent = habits.length ? Math.round(complete / habits.length * 100) : 0;
  const title = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return <>
    <header className="page-head today-head"><div><p className="eyebrow">YOUR DAY</p><h1>{date === data.today ? "Today" : title}</h1><p className="subtle">{title}</p></div><Link className="button primary" href="/habits/new">+ Add habit</Link></header>
    <section className="daily-summary" aria-label="Daily progress"><div className="row"><div><strong>{complete} of {habits.length} complete</strong><p className="subtle">{partial ? `${partial} in progress · ` : ""}{habits.length - complete - partial} remaining</p></div><strong className="daily-percent">{percent}%</strong></div><progress value={complete} max={habits.length || 1} aria-label={`${complete} of ${habits.length} scheduled habits completed`}/><p className="daily-rule">Only scheduled habits count. Partial, failed and skipped habits remain incomplete; paused and unscheduled habits are excluded.</p></section>
    <nav className="actions day-navigation" aria-label="Choose day"><Link className="button small" href={`/today?date=${shiftDate(date, -1)}`}>← Previous</Link>{date !== data.today && <Link className="button small" href="/today">Today</Link>}<Link className="button small" href={`/today?date=${shiftDate(date, 1)}`}>Next →</Link></nav>
    {definitions.available && <section className="today-group" aria-labelledby="today-routines"><div className="today-group-head"><h2 id="today-routines">Routines</h2><Link href="/routines" className="button small">Manage routines</Link></div>{routineOccurrences.length ? <div className="today-list">{routineOccurrences.map(occurrence => {
      const routine = definitions.routines.find(item => item.id === occurrence.routine_id);
      const steps = (routineSteps as ItemOccurrence[]).filter(item => item.occurrence_id === occurrence.id);
      const summary = progress(steps);
      const status = effectiveStatus(occurrence, steps, localRoutineDate(occurrence.timezone));
      return <article className="today-habit" key={occurrence.id}><div className="today-habit-label"><span className="habit-icon" aria-hidden="true">☀</span><div><Link className="habit-title" href={`/routine-occurrences/${occurrence.id}`}>{routine?.name ?? "Routine"}</Link><div className="habit-meta">{summary.done} of {summary.total} required steps done{summary.skipped ? ` · ${summary.skipped} skipped` : ""} · {status.toLowerCase().replaceAll("_", " ")}{occurrence.planned_time ? ` · ${occurrence.planned_time.slice(0, 5)}` : ""}</div></div></div><Link className="button small" href={`/routine-occurrences/${occurrence.id}`}>{status === "SCHEDULED" ? "Start" : "Open"}</Link></article>;
    })}</div> : <div className="card empty"><h3>No routines scheduled</h3><p>Build a routine for a repeatable part of your day.</p><Link className="button" href="/routines/new">Create routine</Link></div>}</section>}
    {!definitions.available && <Alert severity="info" sx={{ my: 2 }}>Routines are being set up. Habit tracking is still available.</Alert>}
    {habits.length ? groups.map(group => {
      const items = habits.filter(habit => (habit.time_of_day ?? "ANYTIME") === group.id);
      if (!items.length) return null;
      const done = items.filter(achieved).length;
      return <section className="today-group" key={group.id} aria-labelledby={`group-${group.id}`}><div className="today-group-head"><h2 id={`group-${group.id}`}>{group.label}</h2><span>{done}/{items.length}</span></div><div className="today-list">{items.map(habit => {
        const log = byHabit.get(habit.id);
        const status = achieved(habit) ? "Complete" : inProgress(habit) ? "In progress" : log?.status === "FAILED" ? "Failed" : log?.status === "SKIPPED" ? "Skipped" : "Remaining";
        const progress = periodProgress(habit);
        const period = progress ? ` · ${progress.count}/${progress.target} this ${habit.schedule_type === "WEEKLY_TARGET" ? "week" : "month"}` : "";
        const measured = habit.tracking_type === "MEASURABLE" ? ` · ${Number(log?.value ?? 0)} / ${habit.goal_value} ${habit.unit}` : "";
        return <article className="today-habit" key={habit.id}><div className="today-habit-label"><span className="habit-icon" aria-hidden="true">{habit.icon || "✓"}</span><div><Link className="habit-title" href={`/habits/${habit.id}`}>{habit.name}</Link><div className="habit-meta">{status}{period}{measured}{habit.minimum_goal_value ? ` · minimum ${habit.minimum_goal_value}` : ""}{habit.stretch_goal_value ? ` · stretch ${habit.stretch_goal_value}` : ""}</div></div></div><CheckIn habit={habit} date={date} initial={log}/></article>;
      })}</div></section>;
    }) : <div className="card empty"><h2>Nothing scheduled today</h2><p>Enjoy the open day, or add a habit when you’re ready.</p><Link className="button primary" href="/habits/new">Create habit</Link></div>}
  </>;
}
