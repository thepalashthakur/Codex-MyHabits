"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ListItemButton from "@mui/material/ListItemButton";

const links = [["Today", "/today"], ["Habits", "/habits"], ["History", "/history"], ["Insights", "/insights"], ["Areas", "/areas"], ["Settings", "/settings"]] as const;

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return <nav className={mobile ? "mobile-nav" : "nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
    {links.map(([label, href]) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <ListItemButton component={Link} key={href} href={href} selected={active} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{label}</ListItemButton>;
    })}
  </nav>;
}
