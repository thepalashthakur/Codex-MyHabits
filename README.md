# MyHabits

A Next.js habit tracker with Supabase Auth and PostgreSQL, user scoped REST endpoints, and a bearer token MCP endpoint. Inspired by habit tracking concepts, with its own interface and data model.

## Architecture

- `src/app/(app)` contains the authenticated screens: Today, Habits, Areas, History, Analytics, and Settings.
- `src/lib/domain.ts` contains schedule, local date, streak, and statistics functions. Server components query Supabase through `src/lib/data.ts`; interactive controls call HTTP route handlers.
- `src/lib/auth.ts` wraps Supabase Auth. It follows the same email/password and server cookie pattern as the supplied `UseAuth` reference repo, deployed at `https://use-auth-rosy.vercel.app`. MyHabits must use **the same Supabase project** so existing UseAuth accounts can sign in here. The UseAuth hosted cookie cannot be shared across these domains; users sign in on MyHabits to establish its own secure session. No second identity provider or service role key is used. Bearer requests use the same Supabase user identity.
- `supabase/migrations` defines tables, foreign keys, indexes, RLS, and schedule snapshots. The second migration records a new schedule version when a habit's schedule, goal, or archive state changes. History uses the version effective on the viewed date. A skip preserves a streak without increasing it; a failed or unrecorded past scheduled opportunity ends it. Weekly and monthly target streaks count successful periods.

## Setup

1. Use the same Supabase project as UseAuth and apply the SQL files in `supabase/migrations` in filename order. The tracker tables all start with `tracker_`; the existing `profiles`, `areas`, `habits`, and `habit_logs` tables belong to another schema and must be left alone.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the **same project values** used by UseAuth, plus `APP_URL` (for example, `http://localhost:3000`). These are server environment variables; do not prefix the key with `NEXT_PUBLIC_`.
3. In Supabase Auth, enable email/password and allow your app URL and `/auth/confirm` as a redirect. This app uses Supabase Auth email confirmation when enabled.
4. Run `npm install` and `npm run dev`. Existing UseAuth users can sign in at `/sign-in`; new users can use `/sign-up` after adding the MyHabits callback URL in Supabase Auth.

`tracker_profiles`, `tracker_areas`, `tracker_habits`, `tracker_habit_logs`, `tracker_habit_notes`, `tracker_habit_reminders`, and `tracker_habit_schedule_versions` have RLS. Queries and mutations also filter by the authenticated `user_id`. The client never supplies an authoritative user ID. Deleting an area sets its habits' `area_id` to null. Deleting a habit cascades to its logs, notes, reminders, and versions.

Optional local sample data is in `supabase/seed.dev.sql`. It requires an existing Supabase Auth user and is never run automatically.

## API and MCP

The REST API is under `/api/v1`: `areas`, `habits`, `logs`, `notes`, `reminders`, and `profile`. Browser requests use a secure Supabase session cookie; external clients send `Authorization: Bearer <Supabase access token>`. Mutations validate input and ownership. Browser mutations require a same origin `Origin` header. Logs use `PUT /api/v1/logs` with `status: null` to undo; a unique `(habit_id, date)` constraint makes repeated check-ins idempotent.

`POST /api/mcp` supports MCP JSON-RPC `initialize`, `tools/list`, and `tools/call` over HTTP with a Supabase Bearer access token. Tools include `list_habits`, `create_area`, `create_habit`, `update_habit`, and `log_habit`. Clients must obtain a token through Supabase Auth. A hosted OAuth authorization flow and ChatGPT connector registration are not included yet.

## Verification and deployment

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Add the same three environment variables in Vercel and configure the deployed URL in Supabase Auth before deploying. No background process is required.

## Current limits

- Reminder times are stored, but no notification delivery is configured.
- Analytics offers 7 days, 30 days, 3 months, 6 months, 1 year, and all time. Large accounts currently load and aggregate paginated logs in the server process; database-side aggregates would improve latency at scale.
- Weekly and monthly target streaks use the current target for earlier periods when a target has changed. Daily, weekday, and interval history uses schedule snapshots.
- The UI and build can be checked locally without Supabase credentials, but authenticated database, RLS, and live MCP flows require a configured Supabase project. No Vercel deployment has been made.
- `https://s3-sync.vercel.app` is a separate deployed service. MyHabits does not use it because habits have no file uploads.
