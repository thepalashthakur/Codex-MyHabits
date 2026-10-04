import type { Metadata } from "next";
import Script from "next/script";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { AppThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";
import "./design-system.css";
export const metadata: Metadata = { title: { default: "MyHabits", template: "%s · MyHabits" }, description: "A focused habit tracker" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><body><Script id="theme-boot" strategy="beforeInteractive">{`try{const value=localStorage.getItem("myhabits-theme");if(value==="light"||value==="dark")document.documentElement.dataset.theme=value}catch{}`}</Script><AppRouterCacheProvider><AppThemeProvider>{children}</AppThemeProvider></AppRouterCacheProvider></body></html>; }
