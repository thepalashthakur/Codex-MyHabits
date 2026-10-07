import Link from "next/link";
import { appData, logsBetween } from "@/lib/data";
import { dateFromDay, dayNumber, getHabitStateForDate, getPeriodTargetProgress, getScheduledHabits, logAchievesGoal, monthStart, shiftDate, weekStart } from "@/lib/domain";

export default async function History({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const data = await appData();
  const requested = (await searchParams).month;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : data.today.slice(0, 7);
  const from = `${month}-01`;
  const monthDays = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const to = `${month}-${String(monthDays).padStart(2, "0")}`;
  const logs = await logsBetween(data.user.id, data.client, weekStart(from), to);
  const byDate = new Map<string, typeof logs>();
  for (const log of logs) byDate.set(log.date, [...(byDate.get(log.date) ?? []), log]);
  const days = Array.from({ length: monthDays }, (_, index) => dateFromDay(dayNumber(from) + index));
  const previous = monthStart(shiftDate(from, -1)).slice(0, 7);
  const next = monthStart(shiftDate(to, 1)).slice(0, 7);

  return <>
    <header className="page-head"><div><p className="eyebrow">LOOK BACK</p><h1>History</h1><p className="subtle">Every check-in leaves a useful record.</p></div><div className="actions"><Link className="button small" href={`/history?month=${previous}`} aria-label="Previous month">←</Link><span className="pill">{month}</span><Link className="button small" href={`/history?month=${next}`} aria-label="Next month">→</Link></div></header>
    <div className="calendar">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <b className="muted" key={day}>{day}</b>)}
      {Array.from({ length: (new Date(`${from}T12:00:00Z`).getUTCDay() + 6) % 7 }, (_, index) => <span key={`blank-${index}`}/>)}
      {days.map(date => {
        const scheduled = getScheduledHabits(data.habits, date, data.versions, data.pauses);
        const dayLogs = byDate.get(date) ?? [];
        const completed = scheduled.filter(habit => getPeriodTargetProgress(habit, logs, date, data.versions, data.pauses)?.achieved ?? logAchievesGoal(habit, dayLogs.find(log => log.habit_id === habit.id))).length;
        const failed = scheduled.some(habit => dayLogs.some(log => log.habit_id === habit.id && log.status === "FAILED"));
        const partial = scheduled.some(habit => {
          const progress = getPeriodTargetProgress(habit, logs, date, data.versions, data.pauses);
          const log = dayLogs.find(item => item.habit_id === habit.id);
          return progress ? progress.count > 0 && !progress.achieved : log?.status === "COMPLETED" && !logAchievesGoal(habit, log);
        });
        const skipped = scheduled.some(habit => dayLogs.some(log => log.habit_id === habit.id && log.status === "SKIPPED"));
        const states = data.habits.map(habit => getHabitStateForDate(habit, date, data.today, dayLogs.find(log => log.habit_id === habit.id), data.versions, data.pauses));
        const missed = states.includes("MISSED");
        const paused = states.filter(state => state === "PAUSED").length;
        const label = scheduled.length ? `${completed}/${scheduled.length} complete${partial ? ", partial" : ""}${failed ? ", failed" : ""}${skipped ? ", skipped" : ""}${missed ? ", missed" : ""}` : paused ? `${paused} paused` : "Not scheduled";
        return <Link href={`/today?date=${date}`} key={date} aria-label={`${date}: ${label}`} className={`day ${completed && completed === scheduled.length ? "good" : failed || missed ? "bad" : ""}`}><b>{date.slice(-2)}</b><small>{label}</small></Link>;
      })}
    </div>
    <p className="subtle">Select a day to review or update its scheduled habits. Paused dates are separate from skipped and unscheduled days.</p>
  </>;
}
