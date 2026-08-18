-- Run once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent (create-if-not-exists /
-- drop-then-create for policies).
--
-- Context: the game used to log players in by asking for a name that had
-- to already exist as a game2_scores.player_name (see the old LoginForm /
-- registerPlayer flow). That's gone now — see src/services/sessionHandoff.ts
-- and src/pages/Login.tsx. The game now:
--   1. Receives a real Supabase Auth session from the main site (via
--      access_token/refresh_token handed off in the URL).
--   2. Looks up this table by auth.uid() to see if that person already has
--      a saved captain name.
--   3. If not, asks once and writes it here — permanently, see the RLS
--      policies below.

create table if not exists public.gamer_profile (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  player_name text not null,
  created_at timestamp with time zone not null default now()
);

alter table public.gamer_profile enable row level security;

drop policy if exists "Users read own profile" on public.gamer_profile;
create policy "Users read own profile"
  on public.gamer_profile for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own profile once" on public.gamer_profile;
create policy "Users insert own profile once"
  on public.gamer_profile for insert
  with check (auth.uid() = user_id);

-- Deliberately no UPDATE (or DELETE) policy. With RLS enabled and no
-- update policy, Postgres rejects every update attempt against this table
-- regardless of who's asking — that's what makes the captain name
-- immutable after it's saved, enforced at the database level rather than
-- only by the app not showing an edit button.

-- ---------------------------------------------------------------------
-- Re-tighten game2_scores now that real sessions exist
-- ---------------------------------------------------------------------
-- fix_rls_for_name_login.sql previously opened insert/update to "true" (no
-- auth check) because the old name-based login never produced a real
-- Supabase session, so auth.uid() was always null and the original
-- auth.uid() = zephoria_user_id policies rejected every write. Now that
-- the game always has a real session before it ever writes to this table
-- (see AuthGate flow above), those original policies are safe to restore
-- — this also closes the "anyone with the anon key can overwrite any
-- player's score" hole that the public-write policies left open.
drop policy if exists "Public insert access" on public.game2_scores;
drop policy if exists "Users insert their own score" on public.game2_scores;
create policy "Users insert their own score"
  on public.game2_scores for insert
  with check (auth.uid() = zephoria_user_id);

drop policy if exists "Public update access" on public.game2_scores;
drop policy if exists "Users update their own score" on public.game2_scores;
create policy "Users update their own score"
  on public.game2_scores for update
  using (auth.uid() = zephoria_user_id)
  with check (auth.uid() = zephoria_user_id);

-- "Public read access" (select) is unchanged — the leaderboard still needs
-- to show everyone's scores.
