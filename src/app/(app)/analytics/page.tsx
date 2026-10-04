import Link from "next/link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { appData, logsBetween } from "@/lib/data";
import { calculateHabitStatistics, calculateStreaks, dateFromDay, dayNumber, getScheduledHabits, habitOnDate, logAchievesGoal, shiftDate } from "@/lib/domain";
const ranges = { "7d": 7, "30d": 30, "3m": 90, "6m": 180, "1y": 365, all: 0 } as const;
export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const data = await appData();
  const requested = (await searchParams).range;
  const range = requested && requested in ranges ? requested as keyof typeof ranges : "30d";
  const active = data.habits.filter(h => !h.is_archived);
  const firstStart = active.map(h => h.start_date).sort()[0] ?? data.today;
  const allLogs = await logsBetween(data.user.id, data.client, firstStart, data.today);
  const from = ranges[range] ? shiftDate(data.today, 1 - ranges[range]) : firstStart;
  const logs = allLogs.filter(l => l.date >= from);
  const stats = active.map(h => ({ habit: h, ...calculateHabitStatistics(h, logs.filter(l => l.habit_id === h.id), from, data.today, data.versions), streak: calculateStreaks(h, allLogs.filter(l => l.habit_id === h.id), data.today, data.versions).current }));
  const achieved = stats.reduce((n,s) => n + s.successfulOpportunities, 0);
  const opportunities = stats.reduce((n,s) => n + s.opportunities, 0);
  const last7 = Array.from({ length: 7 }, (_,i) => dateFromDay(dayNumber(data.today) - 6 + i));
  const areaNames = new Map(data.areas.map(a => [a.id, a.name]));
  const byArea = data.areas.map(area => { const rows = stats.filter(s => s.habit.area_id === area.id); const done = rows.reduce((n,s) => n + s.successfulOpportunities, 0); const total = rows.reduce((n,s) => n + s.opportunities, 0); return { area, done, total }; });
  const trend = last7.map(date => { const scheduled = getScheduledHabits(active, date, data.versions); const done = scheduled.filter(h => logAchievesGoal(h, logs.find(l => l.habit_id === h.id && l.date === date))).length; return { date, done, total: scheduled.length }; });
  const previousStart = shiftDate(data.today, -13), previousEnd = shiftDate(data.today, -7), currentStart = shiftDate(data.today, -6);
  const weekRate = (start: string, end: string) => { const values = active.map(h => calculateHabitStatistics(h, allLogs.filter(l => l.habit_id === h.id), start, end, data.versions)); const done = values.reduce((n,v) => n + v.successfulOpportunities, 0), total = values.reduce((n,v) => n + v.opportunities, 0); return total ? Math.round(done / total * 100) : 0; };
  const thisWeek = weekRate(currentStart, data.today), previousWeek = weekRate(previousStart, previousEnd);
  return <>
    <header className="page-head"><div><p className="eyebrow">THE BIG PICTURE</p><h1>Analytics</h1><p className="subtle">Understand your consistency over time.</p></div></header>
    <nav className="actions" aria-label="Analytics range" style={{ marginBottom: 20 }}>{Object.keys(ranges).map(key => <Link className={`button small ${range === key ? "primary" : ""}`} key={key} href={`/analytics?range=${key}`}>{key === "all" ? "All time" : key}</Link>)}</nav>
    <div className="grid"><div className="card stat"><div className="value">{opportunities ? Math.round(achieved / opportunities * 100) : 0}%</div><div className="label">completion rate</div></div><div className="card stat"><div className="value">{active.length}</div><div className="label">active habits</div></div><div className="card stat"><div className="value">{Math.max(0, ...stats.map(s => s.streak))}</div><div className="label">longest current streak</div></div></div>
    <h2 className="section-title">This week vs previous week</h2><div className="card row"><span>{thisWeek}% this week · {previousWeek}% previous week</span><span className="pill">{thisWeek - previousWeek >= 0 ? "+" : ""}{thisWeek - previousWeek} points</span></div>
    <h2 className="section-title">Completed per day</h2><div className="card"><div className="grid" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>{trend.map(day => <div key={day.date} style={{ textAlign: "center" }}><b>{day.done}</b><div className="progress"><span style={{ width: `${day.total ? day.done / day.total * 100 : 0}%` }}/></div><small className="muted">{day.date.slice(5)}</small></div>)}</div></div>
    <h2 className="section-title">Last 7 days</h2>{active.length ? <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}><Table size="small" sx={{ minWidth: 640 }} aria-label="Habit activity over the last seven days"><TableHead><TableRow><TableCell>Habit</TableCell>{last7.map(date => <TableCell key={date} align="center">{new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</TableCell>)}</TableRow></TableHead><TableBody>{active.map(h => <TableRow key={h.id}><TableCell component="th" scope="row">{h.name}</TableCell>{last7.map(date => { const scheduled = getScheduledHabits([h], date, data.versions).length > 0, datedHabit = habitOnDate(h, data.versions, date), log = logs.find(l => l.habit_id === h.id && l.date === date); return <TableCell align="center" key={date} title={`${date}: ${!scheduled ? "not scheduled" : log?.status ?? "pending"}`}>{!scheduled ? "–" : log?.status === "SKIPPED" ? "→" : log?.status === "FAILED" ? "×" : logAchievesGoal(datedHabit, log) ? "✓" : "○"}</TableCell>; })}</TableRow>)}</TableBody></Table></TableContainer> : <div className="card empty"><h2>No analytics yet</h2><p>Create a habit to begin tracking progress.</p></div>}
    <h2 className="section-title">By area</h2><div className="list">{byArea.length ? byArea.map(({ area, done, total }) => <div className="card row" key={area.id}><b>{area.name}</b><span className="pill">{total ? Math.round(done / total * 100) : 0}%</span></div>) : <div className="card empty">Create areas to compare groups of habits.</div>}</div>
    <h2 className="section-title">By habit</h2><div className="list">{stats.map(s => <div className="card row" key={s.habit.id}><div><b>{s.habit.name}</b><div className="habit-meta">{s.habit.area_id ? areaNames.get(s.habit.area_id) : "Uncategorized"} · {s.completed} completed logs</div></div><span className="pill">{Math.round(s.completionRate * 100)}%</span></div>)}</div>
  </>;
}
