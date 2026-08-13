-- Safe to run any number of times. Fixes the "policy already exists" /
-- "already member of publication" errors from re-running schema.sql.

drop policy if exists "Public read access" on public.leaderboard;
drop policy if exists "Public insert access" on public.leaderboard;
drop policy if exists "Public update access" on public.leaderboard;

create policy "Public read access"
  on public.leaderboard for select
  using (true);

create policy "Public insert access"
  on public.leaderboard for insert
  with check (true);

create policy "Public update access"
  on public.leaderboard for update
  using (true)
  with check (true);

-- Only add the table to the realtime publication if it isn't already in it.
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
