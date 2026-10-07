# MyHabits V2 implementation plan

## Reuse and migration

Keep the Next.js App Router, MUI theme, Supabase Auth/RLS, REST routes, schedule-version trigger, single log per habit/date, timezone handling, and existing notes/reminders. Preserve all V1 tables and rows. Add nullable or defaulted habit metadata, pause periods, relationships, and optional log reasons in additive SQL migrations. Do not change old logs or reset schedules. Apply migrations in filename order before enabling new controls in production.

## Domain and services

Extend `domain.ts` as the source of truth for dated schedule state, pauses, partial progress, period targets, streaks, and statistics. Keep calculations out of React. Add validation and scoped API operations for new metadata, pauses, and relationships. Snapshot new planning fields only when they affect historical interpretation. Use bounded log queries for period views.

## Screens

1. Compact Today with time-of-day groups, progress, and inline actions.
2. Progressive creation with templates and advanced planning controls.
3. Habit detail and History with distinct dated states and accessible activity cells.
4. Insights, Areas, weekly review, and quiet milestones using shared statistics.
5. Settings data export and safe previewed import.

## Verification

Run deterministic domain/API validation tests and the existing suite, lint, type checks, and build after meaningful phases. Review desktop and mobile flows in a browser. Live authenticated persistence and RLS checks require the production Supabase migrations and a test account.
