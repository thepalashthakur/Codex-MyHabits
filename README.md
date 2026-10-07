# MyHabits

A Next.js habit tracker with Supabase Auth and PostgreSQL, user scoped REST endpoints, and a bearer token MCP endpoint. Inspired by habit tracking concepts, with its own interface and data model.

## Architecture

- `src/app/(app)` contains the authenticated screens: Today, Habits, Areas, History, Insights, and Settings. `/analytics` redirects to Insights.
- `src/lib/domain.ts` contains dated schedule, pause, goal-tier, streak, and statistics functions. `src/lib/insights.ts` builds period comparisons, rankings, and weekly reviews. Server components query Supabase through `src/lib/data.ts`; interactive controls call HTTP route handlers.
- `src/lib/auth.ts` wraps Supabase Auth. It follows the same email/password and server cookie pattern as the supplied `UseAuth` reference repo, deployed at `https://use-auth-rosy.vercel.app`. MyHabits must use **the same Supabase project** so existing UseAuth accounts can sign in here. The UseAuth hosted cookie cannot be shared across these domains; users sign in on MyHabits to establish its own secure session. No second identity provider or service role key is used. Bearer requests use the same Supabase user identity.
- `supabase/migrations` defines tables, foreign keys, indexes, RLS, and schedule snapshots. The V2 migration adds planning metadata, pause periods, routine relationships, and optional skip reasons. History uses the version effective on the viewed date. A skip preserves a streak without increasing it; pauses are excluded from scheduled opportunities. Weekly and monthly target streaks count successful periods.

## Setup

1. Use the same Supabase project as UseAuth and apply the SQL files in `supabase/migrations` in filename order. The tracker tables all start with `tracker_`; the existing `profiles`, `areas`, `habits`, and `habit_logs` tables belong to another schema and must be left alone.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the **same project values** used by UseAuth, plus `APP_URL` (for example, `http://localhost:3000`). These are server environment variables; do not prefix the key with `NEXT_PUBLIC_`.
3. In Supabase Auth, enable email/password and allow your app URL and `/auth/confirm` as a redirect. This app uses Supabase Auth email confirmation when enabled.
4. Use Node.js 24, run `npm install` and `npm run dev`. Existing UseAuth users can sign in at `/sign-in`; new users can use `/sign-up` after adding `https://myhabits-dun.vercel.app/auth/confirm` to the shared Supabase Auth redirect URLs.

All `tracker_*` tables, including V2 pauses and relationships, have RLS. Queries and mutations also filter by the authenticated `user_id`. The client never supplies an authoritative user ID. Deleting an area sets its habits' `area_id` to null. Deleting a habit cascades to its activity and relationships.

Optional local sample data is in `supabase/seed.dev.sql`. It requires an existing Supabase Auth user and is never run automatically.

## API and MCP

The REST API is under `/api/v1`: `areas`, `habits`, `logs`, `notes`, `reminders`, `relationships`, `profile`, and `data`. Habit pause and reorder endpoints live under `habits`. Browser requests use a secure Supabase session cookie; external clients send `Authorization: Bearer <Supabase access token>`. Mutations validate input and ownership. Browser mutations require a same origin `Origin` header. Logs use `PUT /api/v1/logs` with `status: null` to undo; a unique `(habit_id, date)` constraint makes repeated check-ins idempotent. Settings exports JSON or table CSV files; JSON imports are validated, previewed, then transactionally copied or skipped without overwriting existing records.

## V2 behavior

- Today groups habits by time of day and supports Boolean check-ins, measurable increments, partial progress, and weekly/monthly targets. The normal completion and streak threshold is the **target**; minimum and stretch are distinct progress tiers.
- Habit planning supports priority, difficulty, quick increments, pause periods, explicit after-habit relationships, templates, and compact creation. A pause date takes precedence over a scheduled opportunity, and paused days do not become missed days.
- Habit detail, History, Insights, and Areas use dated schedule state. Existing V1 schedule versions are backfilled with the habit's **current** name, area, and new planning fields during migration; historical changes to those fields before V2 cannot be reconstructed. Future edits snapshot those fields on the effective local date.
- Weekly reviews and milestones are calculated from activity. They do not create separate persistent records.

`POST /api/mcp` supports MCP JSON-RPC `initialize`, `tools/list`, and `tools/call` over HTTP with a Supabase Bearer access token. Tools include `list_habits`, `create_area`, `create_habit`, `update_habit`, and `log_habit`. Clients must obtain a token through Supabase Auth. A hosted OAuth authorization flow and ChatGPT connector registration are not included yet.

## Verification and deployment

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Apply `20261007000000_habit_v2_foundations.sql` to the shared Supabase project **before** deploying the V2 application; the new UI and API expect its columns and tables. The Vercel project `myhabits` is linked and its first production deployment is at `https://myhabits-dun.vercel.app` with deployment protection. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured in Vercel; `APP_URL` is set for production. Add `/auth/confirm` to the shared Supabase Auth redirect URLs. No background process is required.

## Current limits

- Reminder times are stored, but no notification delivery is configured.
- Insights aggregates paginated logs in the server process. Database-side aggregates would improve latency for accounts with years of activity.
- Weekly and monthly target streaks use the current target for earlier periods when a target has changed. Daily, weekday, and interval history uses schedule snapshots.
- The V2 database migration, authenticated database behavior, RLS, import round-trip, and live MCP flows require verification against the shared Supabase project with an authenticated test account.
- `https://s3-sync.vercel.app` is a separate deployed service. MyHabits does not use it because habits have no file uploads.
