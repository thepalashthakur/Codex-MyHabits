import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ThemeBoot } from "@/components/theme-boot";
const links = [["Today", "/today"], ["Habits", "/habits"], ["History", "/history"], ["Analytics", "/analytics"], ["Areas", "/areas"], ["Settings", "/settings"]];
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="app"><ThemeBoot/><aside className="sidebar"><Link href="/today" className="brand">My<span>Habits</span></Link><nav className="nav" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><div className="sidebar-foot">{user.email}</div></aside><main className="content">{children}</main><nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav></div>;
}
