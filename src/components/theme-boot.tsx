"use client";
import { useEffect } from "react";
export function ThemeBoot() { useEffect(() => { const theme = localStorage.getItem("myhabits-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; }, []); return null; }
