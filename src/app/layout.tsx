import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "MyHabits", template: "%s · MyHabits" }, description: "A focused habit tracker" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
