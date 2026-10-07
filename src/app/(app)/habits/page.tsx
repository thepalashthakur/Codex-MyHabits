import Link from "next/link";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { ReorderHabit } from "@/components/reorder-habit";
import { appData } from "@/lib/data";
import { isHabitPausedForDate, type Habit, type TimeOfDay } from "@/lib/domain";

type Filters = { q?: string; area?: string; status?: string; type?: string; tracking?: string; time?: string; priority?: string };
const groups: { id: TimeOfDay; label: string }[] = [{ id: "MORNING", label: "Morning" }, { id: "AFTERNOON", label: "Afternoon" }, { id: "EVENING", label: "Evening" }, { id: "ANYTIME", label: "Anytime" }];

export default async function Habits({ searchParams }: { searchParams: Promise<Filters> }) {
  const data = await appData();
  const filters = await searchParams;
  const q = (filters.q ?? "").trim().toLocaleLowerCase().slice(0, 120);
  const status = filters.status ?? "all";
  const names = new Map(data.areas.map(area => [area.id, area.name]));
  const paused = (habit: Habit) => isHabitPausedForDate(habit.id, data.today, data.pauses);
  const filtered = data.habits.filter(habit => {
    if (q && !habit.name.toLocaleLowerCase().includes(q)) return false;
    if (filters.area && (filters.area === "uncategorized" ? Boolean(habit.area_id) : habit.area_id !== filters.area)) return false;
    if (filters.type && habit.type !== filters.type) return false;
    if (filters.tracking && habit.tracking_type !== filters.tracking) return false;
    if (filters.time && (habit.time_of_day ?? "ANYTIME") !== filters.time) return false;
    if (filters.priority && (habit.priority ?? "NORMAL") !== filters.priority) return false;
    if (status === "active" && (habit.is_archived || paused(habit) || habit.start_date > data.today)) return false;
    if (status === "paused" && (habit.is_archived || !paused(habit))) return false;
    if (status === "archived" && !habit.is_archived) return false;
    if (status === "upcoming" && (habit.is_archived || habit.start_date <= data.today)) return false;
    return true;
  });
  const canReorder = !q && !filters.area && !filters.type && !filters.tracking && !filters.time && !filters.priority && status === "all";
  const active = filtered.filter(habit => !habit.is_archived);
  const archived = filtered.filter(habit => habit.is_archived);
  const row = (habit: Habit, ids?: string[], index?: number) => <div className="habit-list-row" key={habit.id}><Link className="habit-list-link" href={`/habits/${habit.id}`}><span className="habit-icon" aria-hidden="true">{habit.icon || "✓"}</span><span><strong>{habit.name}</strong><small>{habit.area_id ? names.get(habit.area_id) ?? "Uncategorized" : "Uncategorized"} · {habit.is_archived ? "Archived" : paused(habit) ? "Paused" : habit.start_date > data.today ? "Upcoming" : "Active"} · {habit.schedule_type.replaceAll("_", " ").toLowerCase()}</small></span></Link>{ids && index !== undefined && <ReorderHabit ids={ids} index={index} name={habit.name}/>}</div>;

  return <><header className="page-head"><div><p className="eyebrow">YOUR ROUTINE</p><h1>Habits</h1><p className="subtle">Find, organize and adjust your habits.</p></div><Link className="button primary" href="/habits/new">+ New habit</Link></header>
    <form method="get" className="habit-filters"><div className="habit-filter-main"><TextField name="q" type="search" label="Search habits" defaultValue={filters.q ?? ""} fullWidth/><TextField select name="status" label="Status" defaultValue={status} sx={{ minWidth: 150 }}><MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="paused">Paused</MenuItem><MenuItem value="upcoming">Upcoming</MenuItem><MenuItem value="archived">Archived</MenuItem></TextField><Button type="submit" variant="contained">Filter</Button></div><details open={Boolean(filters.area || filters.type || filters.tracking || filters.time || filters.priority)}><summary>More filters</summary><div className="habit-filter-extra"><TextField select name="area" label="Area" defaultValue={filters.area ?? ""}><MenuItem value="">All areas</MenuItem><MenuItem value="uncategorized">Uncategorized</MenuItem>{data.areas.map(area => <MenuItem value={area.id} key={area.id}>{area.name}</MenuItem>)}</TextField><TextField select name="type" label="Type" defaultValue={filters.type ?? ""}><MenuItem value="">Build and break</MenuItem><MenuItem value="GOOD">Build</MenuItem><MenuItem value="BAD">Break</MenuItem></TextField><TextField select name="tracking" label="Tracking" defaultValue={filters.tracking ?? ""}><MenuItem value="">Any tracking</MenuItem><MenuItem value="BOOLEAN">Yes or no</MenuItem><MenuItem value="MEASURABLE">Measured</MenuItem></TextField><TextField select name="time" label="Time of day" defaultValue={filters.time ?? ""}><MenuItem value="">Any time</MenuItem>{groups.map(group => <MenuItem value={group.id} key={group.id}>{group.label}</MenuItem>)}</TextField><TextField select name="priority" label="Priority" defaultValue={filters.priority ?? ""}><MenuItem value="">Any priority</MenuItem><MenuItem value="LOW">Low</MenuItem><MenuItem value="NORMAL">Normal</MenuItem><MenuItem value="HIGH">High</MenuItem></TextField></div></details></form>
    {!filtered.length && <div className="card empty"><h2>{data.habits.length ? "No matching habits" : "No habits yet"}</h2><p>{data.habits.length ? "Try fewer filters or another search." : "Start with one habit you want to repeat consistently."}</p><div className="actions" style={{ justifyContent: "center" }}><Link className="button primary" href="/habits/new">Create habit</Link><Link className="button" href="/habits/new?template=water">Use a template</Link></div></div>}
    {groups.map(group => { const items = active.filter(habit => (habit.time_of_day ?? "ANYTIME") === group.id); if (!items.length) return null; const allIds = data.habits.filter(habit => !habit.is_archived && (habit.time_of_day ?? "ANYTIME") === group.id).map(habit => habit.id); return <section key={group.id}><h2 className="section-title">{group.label} · {items.length}</h2><div className="habit-list">{items.map(habit => row(habit, canReorder ? allIds : undefined, canReorder ? allIds.indexOf(habit.id) : undefined))}</div></section>; })}
    {archived.length > 0 && <section><h2 className="section-title">Archived · {archived.length}</h2><div className="habit-list">{archived.map(habit => row(habit))}</div></section>}
  </>;
}
