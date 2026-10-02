import Link from "next/link";
export default function NotFound() { return <div className="auth-wrap"><div className="card empty"><h1>Page not found</h1><p>The page or habit may have been removed.</p><Link className="button primary" href="/today">Go to Today</Link></div></div>; }
