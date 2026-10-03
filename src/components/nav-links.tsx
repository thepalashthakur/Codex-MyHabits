"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["Today", "/today"], ["Habits", "/habits"], ["History", "/history"], ["Analytics", "/analytics"], ["Areas", "/areas"], ["Settings", "/settings"]] as const;

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return <nav className={mobile ? "mobile-nav" : "nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
    {links.map(([label, href]) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}
  </nav>;
}
