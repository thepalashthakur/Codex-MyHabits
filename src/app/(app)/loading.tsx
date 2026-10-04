import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function Loading() {
  return <Stack spacing={3} aria-label="Loading page">
    <Stack spacing={1}><Skeleton variant="text" width={100} height={20}/><Skeleton variant="text" width="45%" height={52}/><Skeleton variant="text" width="60%" height={24}/></Stack>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" sx={{ width: "100%", height: 112, borderRadius: 2 }}/>)}</Stack>
    <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }}/>
    <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }}/>
  </Stack>;
}
