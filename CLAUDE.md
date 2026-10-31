# November Build Log

A personal tracker for a one-month experiment (Nov 1–30, 2026). One user (me). Two daily goals:

1. **Build** – work on my Roblox game every day (minimum 30 min in Studio). Release target: **Nov 14**. After release: marketing, iterating, updates.
2. **Post** – at least one post per day on my alt account (CS, side projects, Roblox dev, my thoughts).

The app exists to make logging a day take under 30 seconds. It is a tool, not the project. Keep it small.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (auth via email magic link + Postgres) so data syncs between phone and laptop
- Deployed on Vercel
- Installable PWA (manifest + icons) so it opens like an app on my phone

Don't add libraries beyond these unless a feature truly needs one. Charts are hand-written SVG; no charting library.

## Commands

- `npm run dev` – local dev server
- `npm run build` – production build (must pass with no TypeScript errors)
- `npm run lint` – lint

## Data model (Supabase)

Every table has `user_id uuid references auth.users` and Row Level Security so a user only reads and writes their own rows.

- `days` – one row per date: `date (date)`, `built (bool)`, `minutes (int)`, `posted (bool)`, `post_note (text)`, `notes (text)`, `tasks (jsonb: [{text, done}])`. Unique on `(user_id, date)`.
- `settings` – one row per user: `targets (jsonb)` keyed by metric with `start/floor/target/stretch`, `milestones (jsonb)` keyed by milestone id with `{done, on}`, `updates_shipped (int)`, `learned (jsonb: string[3])`.
- `metric_logs` – `metric (text: 'followers' | 'visits')`, `date (date)`, `value (int)`. Unique on `(user_id, metric, date)`; logging again the same day overwrites.
- `notes` – `title (text)`, `body (text)`, `created_at`.

Keep the SQL schema and RLS policies in `supabase/schema.sql`.

## Screens

- **Today** – day navigator limited to Nov 1–30 (defaults to today). Two big toggles: Built / Posted. Minutes input with +30/+60/+90 chips (30+ minutes auto-checks Built). "What I posted" text field. Task list for the day (add, check, delete). Notes textarea. Shows days until Nov 14 release.
- **Month** – days built / 30, days posted / 30, current streaks, total Studio hours, release countdown, a 30-day calendar with two dots per day (tap a day to open it in Today), and a pace chart: cumulative days built and posted vs. a one-per-day line, with Nov 14 marked.
- **Scorecard** – "What I control" (days built, posts, updates shipped counter, milestone checklist) separate from "Results" (followers, game visits): each result has start/floor/target/stretch inputs, a log-today's-number field, a status pill (below floor / floor cleared / target hit / stretch hit), and a line chart with dashed tier lines. Plus three "things I can do now that I couldn't on Nov 1" fields.
- **Ideas** – list of free-form notes (title + body), newest first, with delete confirmation.

Milestones: Core mechanic works (Nov 7), Full game loop playable (Nov 11), Game released (Nov 14), Launch post published (Nov 16), 5+ friends played it (Nov 21).

## Conventions

- Mobile-first. Must be comfortable one-handed at ~390px wide, and also good on a laptop. Tap targets at least 40px.
- Light and dark mode via `prefers-color-scheme`.
- Autosave: text fields save after ~600 ms of no typing; toggles and checkboxes save immediately. Show a small "Saving… / Saved" status. Never lose typed text on a failed save; show the error.
- Optimistic UI: update the screen first, then write to Supabase.
- Dates are local time (America/New_York). Store dates as `YYYY-MM-DD`; never let UTC conversion shift a day.
- Small, readable components. No global state library; React state + a few hooks (`useDay`, `useSettings`, etc.) is enough.
- No feature creep. If something isn't listed above, ask before building it.

## Done means

- `npm run build` passes.
- I can sign in on my phone and laptop and see the same data.
- Logging a day (both toggles + minutes) takes under 30 seconds.
