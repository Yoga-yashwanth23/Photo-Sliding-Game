-- Fix: this app's login is name-based (see supabaseLeaderboardService.ts
-- registerPlayer) — it looks up an existing player_name and never creates
-- a real Supabase Auth session. That means auth.uid() is always null in
-- the browser, so the existing insert/update policies below (which require
-- auth.uid() = zephoria_user_id) silently reject every score submission —
-- which is why completing the game never updated game2_scores.
--
-- This migration loosens insert/update to match the app's real security
-- model: the "gate" is the name having a pre-existing row (enforced in
-- app code at login), not Supabase Auth. Run this once in the Supabase
-- SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).

drop policy if exists "Users insert their own score" on public.game2_scores;
create policy "Public insert access"
  on public.game2_scores for insert
  with check (true);

drop policy if exists "Users update their own score" on public.game2_scores;
create policy "Public update access"
  on public.game2_scores for update
  using (true)
  with check (true);

-- "Public read access" (select) policy is unchanged — it was already public.
