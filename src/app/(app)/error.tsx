"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <div className="card empty"><h2>Could not load this page</h2><p>Please try again.</p><button className="button primary" onClick={reset}>Retry</button></div>; }
