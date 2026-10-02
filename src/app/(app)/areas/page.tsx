import { appData } from "@/lib/data";
import { AreasManager } from "@/components/areas-manager";
export default async function Areas() { const data = await appData(); const counts: Record<string, number> = {}; data.habits.filter(h => !h.is_archived && h.area_id).forEach(h => counts[h.area_id!] = (counts[h.area_id!] ?? 0) + 1); return <><header className="page-head"><div><p className="eyebrow">ORGANIZE</p><h1>Areas</h1><p className="subtle">Group habits around what matters to you.</p></div></header><AreasManager initial={data.areas} counts={counts}/></>; }
