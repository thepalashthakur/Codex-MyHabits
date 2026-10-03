import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ThemeBoot } from "@/components/theme-boot";
import { NavLinks } from "@/components/nav-links";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="app"><ThemeBoot/><aside className="sidebar"><Link href="/today" className="brand">My<span>Habits</span></Link><NavLinks/><div className="sidebar-foot">{user.email}</div></aside><main className="content">{children}</main><NavLinks mobile/></div>;
}
