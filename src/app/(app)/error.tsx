"use client";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <Stack spacing={2} sx={{ maxWidth: 560 }}><Alert severity="error">Could not load this page. Please try again.</Alert><Button variant="contained" onClick={reset} sx={{ alignSelf: "flex-start" }}>Retry</Button></Stack>; }
