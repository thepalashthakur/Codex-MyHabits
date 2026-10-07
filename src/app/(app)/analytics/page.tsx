import { redirect } from "next/navigation";

export default async function AnalyticsRedirect({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = (await searchParams).range;
  redirect(range ? `/insights?range=${encodeURIComponent(range)}` : "/insights");
}
