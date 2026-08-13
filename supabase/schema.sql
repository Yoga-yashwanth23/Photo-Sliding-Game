-- Pirate Puzzle Quest — leaderboard table
-- Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
--
-- Your existing "Slide_Puzzle" table's columns (Rank, Time as `time`,
-- Pirate Rank as int4, a separate Date) don't line up with what the app
-- actually produces (see src/types/index.ts -> LeaderboardEntry): Rank is
-- computed client-side and shouldn't be stored, completion time is a
-- duration in milliseconds not a clock time, and pirateRank is a text
-- label like "🦜 Captain", not a number. Easiest fix is a fresh table
-- rather than reshaping the old one. If you want to keep the old table
-- around, just drop it manually first:
--   drop table if exists public."Slide_Puzzle";

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  player_name text not null,
  completion_time_ms bigint not null,
  moves integer not null,
  final_score numeric not null,
  expected_minimum_moves integer not null,
  move_efficiency numeric not null,
  time_score numeric not null,
  accuracy_score numeric not null,
  pirate_rank text not null,
  letter_grade text not null,
  completed_at bigint not null,
  created_at timestamptz not null default now(),
  -- One row per player (the app upserts: only overwrites when the new
  -- score is better), matching today's localStorage behaviour.
  constraint leaderboard_player_id_key unique (player_id)
);

-- Row Level Security: on by default for new Supabase tables. This app has
-- no login/auth (just a display name), so there's no server-side way to
-- tell "your" row from anyone else's — these policies open read/write to
-- anyone with the public anon key, same trust level as the localStorage
-- version had. Fine for a casual leaderboard; anyone could in principle
-- write a bogus score via the API. If that matters later, add Supabase
-- Auth and scope the insert/update policies to auth.uid().
alter table public.leaderboard enable row level security;

drop policy if exists "Public read access" on public.leaderboard;
create policy "Public read access"
  on public.leaderboard for select
  using (true);

drop policy if exists "Public insert access" on public.leaderboard;
create policy "Public insert access"
  on public.leaderboard for insert
  with check (true);

drop policy if exists "Public update access" on public.leaderboard;
create policy "Public update access"
  on public.leaderboard for update
  using (true)
  with check (true);

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
      and tablename = 'leaderboard'
  ) then
    alter publication supabase_realtime add table public.leaderboard;
  end if;
end $$;
