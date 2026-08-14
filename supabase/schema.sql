-- Pirate Puzzle Quest — game2_scores table
--
-- This documents the table as it now actually exists in Supabase (you
-- created it directly — see the CREATE TABLE you provided). It replaces
-- the old public.leaderboard table this file used to describe; the app's
-- Supabase service (src/services/supabaseLeaderboardService.ts) now talks
-- to game2_scores instead. Re-running the CREATE TABLE below is a no-op if
-- the table already exists (IF NOT EXISTS); it's here for reference/setting
-- up a fresh environment, not something you need to run again.
--
-- Key differences from the old `leaderboard` table:
--   - One row per *authenticated Zephoria user* (zephoria_user_id, unique,
--     FK -> auth.users), not per anonymous locally-generated player id.
--   - player_id is now nullable/legacy — no longer the upsert key.
--   - This game does not perform its own login; it expects a Supabase Auth
--     session (from the shared Zephoria login) to already exist when it
--     loads, and reads the user via supabase.auth.getUser().

create table if not exists public.game2_scores (
  player_name text not null,
  created_at timestamp with time zone not null default now(),
  player_id uuid null,
  completion_time_ms bigint null,
  moves integer null,
  final_score numeric null default 0,
  expected_minimum_moves integer null,
  move_efficiency numeric null,
  time_score numeric null,
  accuracy_score numeric null,
  pirate_rank text null,
  letter_grade text null,
  completed_at bigint null,
  constraint game2_scores_pkey primary key (id),
  constraint game2_scores_user_unique unique (zephoria_user_id),
  constraint game2_scores_user_fk foreign key (zephoria_user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_game2_scores_user on public.game2_scores using btree (zephoria_user_id);

-- Row Level Security: now that every row is tied to a real authenticated
-- user, scope reads/writes to that user's own row instead of leaving the
-- table open to anyone with the anon key (which is what the old, auth-less
-- `leaderboard` table policies did). Leaderboard/statistics reads that need
-- to see *other* players' scores (Leaderboard.tsx, getEntries) rely on the
-- public-read policy below — tighten this if the leaderboard should only be
-- visible to logged-in users.
alter table public.game2_scores enable row level security;

drop policy if exists "Public read access" on public.game2_scores;
create policy "Public read access"
  on public.game2_scores for select
  using (true);

drop policy if exists "Users insert their own score" on public.game2_scores;
create policy "Users insert their own score"
  on public.game2_scores for insert
  with check (auth.uid() = zephoria_user_id);

drop policy if exists "Users update their own score" on public.game2_scores;
create policy "Users update their own score"
  on public.game2_scores for update
  using (auth.uid() = zephoria_user_id)
  with check (auth.uid() = zephoria_user_id);

-- Realtime: lets every open tab/device see new scores immediately,
-- replacing the BroadcastChannel trick the local version used. Only add
-- the table if it isn't already in the publication (re-running this
-- script otherwise errors with "already member of publication").
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game2_scores'
  ) then
    alter publication supabase_realtime add table public.game2_scores;
  end if;
end $$;

-- NOTE: your original CREATE TABLE also referenced a trigger
-- `game2_scores_updated_at` calling a function `update_game2_scores_updated_at()`,
-- but the table as given has no `updated_at` column for that trigger to
-- write to. If you want an updated_at column tracked automatically, add it
-- and the trigger function, e.g.:
--
--   alter table public.game2_scores add column if not exists updated_at
--     timestamp with time zone not null default now();
--
--   create or replace function update_game2_scores_updated_at()
--   returns trigger as $$
--   begin
--     new.updated_at = now();
--     return new;
--   end;
--   $$ language plpgsql;
--
--   drop trigger if exists game2_scores_updated_at on public.game2_scores;
--   create trigger game2_scores_updated_at
--     before update on public.game2_scores
--     for each row execute function update_game2_scores_updated_at();
--
-- Otherwise the trigger reference in your original DDL will fail if you
-- try to re-run it as-is (function doesn't exist yet).
