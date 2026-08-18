import type { Player } from '@/types';
import { supabase } from './supabaseClient';

/**
 * `gamer_profile` is the source of truth for "does this authenticated user
 * already have a captain name?" — separate from `game2_scores`, which is
 * score data. One row per Supabase Auth user (user_id, PK, FK -> auth.users),
 * written once and never updated (see supabase/gamer_profile.sql — there's
 * deliberately no UPDATE policy, so the name is immutable at the database
 * level, not just in the UI).
 */

interface GamerProfileRow {
  user_id: string;
  player_name: string;
}

function toPlayer(row: GamerProfileRow): Player {
  return {
    id: row.user_id,
    name: row.player_name,
    normalisedName: row.player_name.trim().toLowerCase(),
    createdAt: Date.now(),
  };
}

/**
 * Looks up the caller's saved profile. Returns null if this user has never
 * set a captain name before (first time on the game tab) — callers should
 * treat that as "show the one-time name form", not as an error.
 */
export async function fetchGamerProfile(userId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('gamer_profile')
    .select('user_id, player_name')
    .eq('user_id', userId)
    .maybeSingle<GamerProfileRow>();

  if (error) throw error;
  if (!data) return null;
  return toPlayer(data);
}

/**
 * One-time profile creation. Writes the captain name to `gamer_profile`
 * (permanent — no update path exists after this) and seeds a matching
 * `game2_scores` row with a default score of 0, so the player has a
 * leaderboard row from the moment their profile exists rather than only
 * after their first completed puzzle.
 *
 * If `gamer_profile` already has a row for this user (e.g. a double
 * submit, or the name form re-rendering after a slow network response),
 * the unique primary key on user_id causes the insert to fail — callers
 * should treat that as "someone already has a name, go re-fetch it" rather
 * than a hard error.
 */
export async function createGamerProfile(userId: string, name: string): Promise<Player> {
  const trimmed = name.trim();

  const { data, error } = await supabase
    .from('gamer_profile')
    .insert({ user_id: userId, player_name: trimmed })
    .select('user_id, player_name')
    .single<GamerProfileRow>();

  if (error) throw error;

  // Best-effort seed of the scores row. ignoreDuplicates means this is a
  // harmless no-op if one already exists for this user (e.g. a legacy row
  // from the old name-based login) rather than an error.
  const { error: scoreError } = await supabase
    .from('game2_scores')
    .upsert(
      { zephoria_user_id: userId, player_name: trimmed, final_score: 0 },
      { onConflict: 'zephoria_user_id', ignoreDuplicates: true },
    );

  if (scoreError) throw scoreError;

  return toPlayer(data);
}
