import Link from "next/link";
import { notFound } from "next/navigation";
import { appData, logsBetween } from "@/lib/data";
import { shiftDate } from "@/lib/domain";
import { getAreaPerformance, getHabitPerformance } from "@/lib/insights";

export default async function AreaDetail({ params }: { params: Promise<{ areaId: string }> }) {
  const data = await appData();
  const { areaId } = await params;
  const area = data.areas.find(item => item.id === areaId);
  if (!area) notFound();
  const from = shiftDate(data.today, -29);
  const previousFrom = shiftDate(from, -30);
  const logs = await logsBetween(data.user.id, data.client, previousFrom, data.today);
  const insightData = { habits: data.habits, logs, versions: data.versions, pauses: data.pauses, areas: data.areas };
  const current = getAreaPerformance(insightData, from, data.today).find(row => row.area.id === area.id);
  const previous = getAreaPerformance(insightData, previousFrom, shiftDate(from, -1)).find(row => row.area.id === area.id);
  const members = getHabitPerformance(insightData, from, data.today).filter(row => row.habit.area_id === area.id);
  return <><header className="page-head"><div><p className="eyebrow"><Link href="/areas">AREAS</Link></p><h1>{area.icon} {area.name}</h1><p className="subtle">Last 30 days of scheduled activity.</p></div></header><div className="grid"><div className="card stat"><div className="value">{current?.opportunities ? Math.round(current.rate * 100) : 0}%</div><div className="label">consistency · {current?.completed ?? 0}/{current?.opportunities ?? 0}</div></div><div className="card stat"><div className="value">{current?.habitCount ?? 0}</div><div className="label">habits active in this area</div></div><div className="card stat"><div className="value">{current && previous ? `${Math.round((current.rate - previous.rate) * 100) >= 0 ? "+" : ""}${Math.round((current.rate - previous.rate) * 100)}` : "—"}</div><div className="label">points vs previous 30 days</div></div></div><h2 className="section-title">Habits</h2><div className="insight-grid">{members.map(row => <div className="insight-row" key={row.habit.id}><Link href={`/habits/${row.habit.id}`}>{row.habit.name}</Link><span>{Math.round(row.completionRate * 100)}% · {row.successfulOpportunities}/{row.opportunities}</span></div>)}{!members.length && <p className="subtle">No scheduled habits in this area yet.</p>}</div><p className="subtle">Historical area assignments follow saved habit versions.</p></>;
}
