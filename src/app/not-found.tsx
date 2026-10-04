import Link from "next/link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
export default function NotFound() { return <div className="auth-wrap"><Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, maxWidth: 480, textAlign: "center" }}><Stack spacing={2} sx={{ alignItems: "center" }}><Typography variant="h1">Page not found</Typography><Typography color="text.secondary">The page or habit may have been removed.</Typography><Link className="button primary" href="/today">Go to Today</Link></Stack></Paper></div>; }
