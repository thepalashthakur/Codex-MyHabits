import Link from "next/link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { appData, logsBetween } from "@/lib/data";
import { calculateStreaks, dateFromDay, dayNumber, getHabitStateForDate, getScheduledHabits, shiftDate } from "@/lib/domain";
import { getAreaPerformance, getHabitPerformance, getHabitRankings, getOverallConsistency, getPeriodComparison, getWeekdayPerformance, getWeeklyReviewSummary } from "@/lib/insights";

const ranges = { "7d": 7, "30d": 30, "3m": 90, "6m": 180, "1y": 365, all: 0 } as const;
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Insights({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const data = await appData();
  const requested = (await searchParams).range;
  const range = requested && requested in ranges ? requested as keyof typeof ranges : "30d";
  const firstStart = data.habits.map(habit => habit.start_date).sort()[0] ?? data.today;
  const from = ranges[range] ? shiftDate(data.today, 1 - ranges[range]) : firstStart;
  const allLogs = await logsBetween(data.user.id, data.client, firstStart, data.today);
  const insightData = { habits: data.habits, logs: allLogs, versions: data.versions, pauses: data.pauses, areas: data.areas };
  const overall = getOverallConsistency(insightData, from, data.today);
  const comparison = getPeriodComparison(insightData, from, data.today);
  const byHabit = getHabitPerformance(insightData, from, data.today);
  const byArea = getAreaPerformance(insightData, from, data.today);
  const byWeekday = getWeekdayPerformance(insightData, from, data.today);
  const rankings = getHabitRankings(insightData, from, data.today);
  const review = getWeeklyReviewSummary(insightData, data.today);
  const last7 = Array.from({ length: 7 }, (_, index) => dateFromDay(dayNumber(data.today) - 6 + index));
  const logsByKey = new Map(allLogs.map(log => [`${log.habit_id}:${log.date}`, log]));
  const recentHabits = data.habits.filter(habit => last7.some(date => getScheduledHabits([habit], date, data.versions, data.pauses).length));
  const longestCurrent = Math.max(0, ...data.habits.map(habit => calculateStreaks(habit, allLogs.filter(log => log.habit_id === habit.id), data.today, data.versions, data.pauses).current));
  const rate = (value: number) => `${Math.round(value * 100)}%`;

  return <>
    <header className="page-head"><div><p className="eyebrow">THE BIG PICTURE</p><h1>Insights</h1><p className="subtle">See what is working and where a small adjustment may help.</p></div></header>
    <nav className="actions insights-range" aria-label="Insights range">{Object.keys(ranges).map(key => <Link className={`button small ${range === key ? "primary" : ""}`} key={key} href={`/insights?range=${key}`}>{key === "all" ? "All time" : key}</Link>)}</nav>
    <div className="grid"><div className="card stat"><div className="value">{rate(overall.rate)}</div><div className="label">consistency · {overall.completed}/{overall.opportunities} opportunities</div></div><div className="card stat"><div className="value">{comparison.change >= 0 ? "+" : ""}{Math.round(comparison.change * 100)} pts</div><div className="label">vs previous equivalent period</div></div><div className="card stat"><div className="value">{longestCurrent}</div><div className="label">longest current streak</div></div></div>
    {overall.opportunities === 0 && <div className="card empty"><h2>Not enough data yet</h2><p>Keep tracking your scheduled habits and insights will appear here.</p></div>}
    <section><h2 className="section-title">Your week</h2><div className="card"><p className="subtle">{rate(review.current.rate)} consistency · {review.completed} completions · {review.skipped} skipped · {review.missed} missed</p><p className="subtle">{review.change >= 0 ? "Up" : "Down"} {Math.abs(Math.round(review.change * 100))} points from the previous seven days.</p>{review.best && <p className="subtle">Strongest: {review.best.habit.name} · {rate(review.best.completionRate)}</p>}{review.needsAttention && <p className="subtle">Needs attention: {review.needsAttention.habit.name} · {rate(review.needsAttention.completionRate)}</p>}</div></section>
    <section><h2 className="section-title">By weekday</h2><div className="insight-grid">{byWeekday.map(row => <div className="insight-row" key={row.day}><span>{weekdays[row.day]}</span><span>{row.opportunities ? `${rate(row.rate)} · ${row.completed}/${row.opportunities}` : "No scheduled days"}</span></div>)}</div><p className="subtle">Flexible weekly and monthly targets are measured by period, so they are excluded from weekday rates.</p></section>
    <section><h2 className="section-title">Areas</h2><div className="insight-grid">{byArea.map(row => <div className="insight-row" key={row.area.id}><Link href={`/areas/${row.area.id}`}>{row.area.name}</Link><span>{row.opportunities ? `${rate(row.rate)} · ${row.habitCount} habits` : "No scheduled activity"}</span></div>)}{!byArea.length && <p className="subtle">Create an area to compare groups of habits.</p>}</div></section>
    <section><h2 className="section-title">Habits to notice</h2>{rankings.strongest.length || rankings.needsAttention.length ? <div className="insight-columns"><div><h3>Strongest</h3>{rankings.strongest.map(row => <div className="insight-row" key={row.habit.id}><Link href={`/habits/${row.habit.id}`}>{row.habit.name}</Link><span>{rate(row.completionRate)}</span></div>)}</div><div><h3>Needs attention</h3>{rankings.needsAttention.map(row => <div className="insight-row" key={row.habit.id}><Link href={`/habits/${row.habit.id}`}>{row.habit.name}</Link><span>{rate(row.completionRate)}</span></div>)}</div></div> : <p className="subtle">Rankings appear after a habit has at least five scheduled opportunities.</p>}</section>
    <details className="insight-details"><summary>Detailed activity</summary><h2 className="section-title">By habit</h2><div className="insight-grid">{byHabit.map(row => <div className="insight-row" key={row.habit.id}><Link href={`/habits/${row.habit.id}`}>{row.habit.name}</Link><span>{rate(row.completionRate)} · {row.completed} complete · {row.partial} partial</span></div>)}</div><h2 className="section-title">Last seven days</h2><TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}><Table size="small" sx={{ minWidth: 640 }} aria-label="Habit activity over the last seven days"><TableHead><TableRow><TableCell>Habit</TableCell>{last7.map(date => <TableCell key={date} align="center">{date.slice(5)}</TableCell>)}</TableRow></TableHead><TableBody>{recentHabits.map(habit => <TableRow key={habit.id}><TableCell component="th" scope="row">{habit.name}</TableCell>{last7.map(date => { const state = getHabitStateForDate(habit, date, data.today, logsByKey.get(`${habit.id}:${date}`), data.versions, data.pauses); return <TableCell align="center" key={date} title={`${date}: ${state.toLowerCase().replaceAll("_", " ")}`}>{state.toLowerCase().replaceAll("_", " ")}</TableCell>; })}</TableRow>)}</TableBody></Table></TableContainer></details>
  </>;
}
