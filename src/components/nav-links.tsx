"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Drawer from "@mui/material/Drawer";
import ListItemButton from "@mui/material/ListItemButton";
import { Menu, Plus } from "lucide-react";

const links = [["Today", "/today"], ["Habits", "/habits"], ["History", "/history"], ["Insights", "/insights"], ["Areas", "/areas"], ["Settings", "/settings"]] as const;

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (!mobile) return <nav className="nav" aria-label="Main navigation">{links.map(([label, href]) => <ListItemButton component={Link} key={href} href={href} selected={active(href)} className={active(href) ? "active" : undefined} aria-current={active(href) ? "page" : undefined}>{label}</ListItemButton>)}</nav>;

  return <><nav className="mobile-nav" aria-label="Mobile navigation"><Link href="/today" className={active("/today") ? "active" : ""} aria-current={active("/today") ? "page" : undefined}>Today</Link><Link href="/habits" className={active("/habits") ? "active" : ""} aria-current={active("/habits") ? "page" : undefined}>Habits</Link><Link href="/habits/new" aria-label="Create habit" className="mobile-add"><Plus size={20}/><span>New</span></Link><Link href="/history" className={active("/history") ? "active" : ""} aria-current={active("/history") ? "page" : undefined}>History</Link><button type="button" onClick={() => setOpen(true)} aria-label="More navigation" aria-expanded={open}><Menu size={19}/><span>More</span></button></nav><Drawer anchor="bottom" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, pb: "env(safe-area-inset-bottom)" } } }}><nav aria-label="More navigation" className="mobile-more"><ListItemButton component={Link} href="/insights" onClick={() => setOpen(false)} selected={active("/insights")}>Insights</ListItemButton><ListItemButton component={Link} href="/areas" onClick={() => setOpen(false)} selected={active("/areas")}>Areas</ListItemButton><ListItemButton component={Link} href="/settings" onClick={() => setOpen(false)} selected={active("/settings")}>Settings</ListItemButton></nav></Drawer></>;
}
