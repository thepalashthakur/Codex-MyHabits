"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function ThemeBoot() { const router = useRouter(); useEffect(() => { const theme = localStorage.getItem("myhabits-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    fetch("/api/v1/profile").then(r => r.ok ? r.json() : null).then(async body => {
      if (!body) return;
      if (body.profile?.theme === "light" || body.profile?.theme === "dark" || body.profile?.theme === "system") {
        const preference = body.profile.theme;
        document.documentElement.dataset.theme = preference === "system" ? "" : preference;
        localStorage.setItem("myhabits-theme", preference);
      }
      if (!body.configured) { const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; await fetch("/api/v1/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone, theme: "system" }) }); router.refresh(); }
    }).catch(() => {});
  }, [router]); return null; }
