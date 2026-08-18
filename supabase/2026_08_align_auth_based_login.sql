-- ============================================================================
-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run
--
-- Context: the game previously had its own name-based "login" that never
-- created a real Supabase Auth session, so auth.uid() was always null in the
-- browser. fix_rls_for_name_login.sql "solved" that by making game2_scores
-- publicly insertable/updatable by anyone with the anon key — a real
-- security hole (any visitor could overwrite any other player's score row).
--
-- The app now expects a real Supabase Auth session to already exist (the
-- one established by your main website's login/signup) before the game tab
-- is ever shown, and reads identity via supabase.auth.getUser(). This
-- script:
--   1. Reverts game2_scores RLS back to auth.uid()-scoped writes.
--   2. Adds RLS to gamer_profile (it currently isn't shown with RLS in your
--      original CREATE TABLE — add it if missing).
--   3. Locks player_name so it can never be changed once set, at the
--      database level (not just "no edit screen in the UI").
--   4. Verifies get/creates the game2_scores auto-seed trigger function so
--      that inserting a gamer_profile row always produces a matching
--      game2_scores row with player_name/zephoria_user_id populated — this
--      is the piece the client-side insert in gamerProfileService.ts
--      depends on.
-- Safe to run multiple times.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. game2_scores: put real auth-scoped RLS back, remove the public hack
-- ----------------------------------------------------------------------------
alter table public.game2_scores enable row level security;

drop policy if exists "Public insert access" on public.game2_scores;
drop policy if exists "Public update access" on public.game2_scores;
drop policy if exists "Users insert their own score" on public.game2_scores;
drop policy if exists "Users update their own score" on public.game2_scores;
drop policy if exists "Public read access" on public.game2_scores;

create policy "Public read access"
  on public.game2_scores for select
  using (true);

create policy "Users insert their own score"
  on public.game2_scores for insert
  with check (auth.uid() = zephoria_user_id);

create policy "Users update their own score"
  on public.game2_scores for update
  using (auth.uid() = zephoria_user_id)
  with check (auth.uid() = zephoria_user_id);

-- No delete policy: nobody can delete a score row via the anon/authenticated
-- API. Rows are cleaned up automatically via the FK's ON DELETE CASCADE when
-- the auth.users row is deleted.


-- ----------------------------------------------------------------------------
-- 2. gamer_profile: enable RLS, scope to the owning user
-- ----------------------------------------------------------------------------
alter table public.gamer_profile enable row level security;

drop policy if exists "Users read own profile" on public.gamer_profile;
create policy "Users read own profile"
  on public.gamer_profile for select
  using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.gamer_profile;
create policy "Users insert own profile"
  on public.gamer_profile for insert
  with check (auth.uid() = id);

-- Deliberately NO update policy for normal users: player_name is meant to
-- be permanent, and total_score/rank are system-computed by triggers, not
-- something the client should ever write directly. If you later add a
-- column a user IS allowed to edit, add a scoped update policy + the
-- trigger in step 3 will still block player_name specifically.


-- ----------------------------------------------------------------------------
-- 3. Lock player_name at the database level (defense in depth — the client
--    already has no UI to edit it, this makes it impossible even via a
--    direct API call)
-- ----------------------------------------------------------------------------
create or replace function public.prevent_player_name_update()
returns trigger as $$
begin
  if old.player_name is distinct from new.player_name then
    raise exception 'player_name cannot be changed once set';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists gamer_profile_lock_player_name on public.gamer_profile;
create trigger gamer_profile_lock_player_name
  before update on public.gamer_profile
  for each row
  execute function public.prevent_player_name_update();


-- ----------------------------------------------------------------------------
-- 4. Ensure the gamer_profile -> game2_scores auto-seed trigger function
--    actually populates player_name (game2_scores.player_name is NOT NULL,
--    so if this function doesn't set it, every first-time signup will fail
--    to insert into gamer_profile at all, since it's the same statement's
--    trigger firing inside the same transaction).
--
--    This CREATE OR REPLACE assumes create_game2_score_record_trigger
--    points at a function of this name; if your existing function already
--    does this correctly, this is a safe no-op replacement. If your actual
--    function has different logic you want to keep (e.g. extra columns),
--    open Database -> Functions in the Supabase dashboard and compare
--    before running this section.
-- ----------------------------------------------------------------------------
create or replace function public.create_game2_score_record()
returns trigger as $$
begin
  insert into public.game2_scores (zephoria_user_id, player_name)
  values (new.id, new.player_name)
  on conflict (zephoria_user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Re-attach in case the function was just replaced and the trigger needs to
-- pick up the new definition (CREATE OR REPLACE FUNCTION alone is enough in
-- Postgres, but this is here for clarity/safety).
drop trigger if exists create_game2_score_record_trigger on public.gamer_profile;
create trigger create_game2_score_record_trigger
  after insert on public.gamer_profile
  for each row
  execute function public.create_game2_score_record();


-- ----------------------------------------------------------------------------
-- 5. One-time backfill safety net: if any gamer_profile rows already exist
--    without a matching game2_scores row (e.g. created before this trigger
--    was correct), create the missing rows now so existing users aren't
--    stuck.
-- ----------------------------------------------------------------------------
insert into public.game2_scores (zephoria_user_id, player_name)
select gp.id, gp.player_name
from public.gamer_profile gp
left join public.game2_scores gs on gs.zephoria_user_id = gp.id
where gs.zephoria_user_id is null;
