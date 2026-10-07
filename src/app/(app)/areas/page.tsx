import { appData, logsBetween } from "@/lib/data";
import { shiftDate } from "@/lib/domain";
import { getAreaPerformance } from "@/lib/insights";
import { AreasManager } from "@/components/areas-manager";

export default async function Areas() {
  const data = await appData();
  const counts: Record<string, number> = {};
  data.habits.filter(habit => !habit.is_archived && habit.area_id).forEach(habit => counts[habit.area_id!] = (counts[habit.area_id!] ?? 0) + 1);
  const from = shiftDate(data.today, -29);
  const logs = await logsBetween(data.user.id, data.client, from, data.today);
  const rows = getAreaPerformance({ habits: data.habits, logs, versions: data.versions, pauses: data.pauses, areas: data.areas }, from, data.today);
  const performance = Object.fromEntries(rows.map(row => [row.area.id, { completed: row.completed, opportunities: row.opportunities, rate: row.rate }]));
  return <><header className="page-head"><div><p className="eyebrow">ORGANIZE</p><h1>Areas</h1><p className="subtle">See progress across the parts of life you care about. Rates use the last 30 days.</p></div></header><AreasManager initial={data.areas} counts={counts} performance={performance}/></>;
}
