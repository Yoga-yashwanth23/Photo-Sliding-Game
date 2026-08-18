import { supabase } from './supabaseClient';

/**
 * Bridges this game to the shared Zephoria identity: `auth.users` (managed
 * by the main website's login/signup) and `public.gamer_profile` (the
 * captain name, set once elsewhere — e.g. at signup, or the first game tab
 * the user ever opened). This game never collects or writes a name itself;
 * it only ever reads the name already on record for the signed-in user.
 */

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Row shape of `public.gamer_profile`, columns this service touches. */
interface GamerProfileRow {
  id: string;
  player_name: string;
}

/** Returns the currently signed-in Zephoria user, or null if there's no session. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Looks up the captain name already on record for this user. Returns null
 * when there's no `gamer_profile` row yet for this user — the caller
 * (playerStore) treats that as an error state, not something this game
 * prompts for: by the time a signed-in user reaches this game tab, their
 * profile is expected to already exist (created elsewhere in Zephoria).
 */
export async function fetchPlayerName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('gamer_profile')
    .select('player_name')
    .eq('id', userId)
    .maybeSingle<GamerProfileRow>();

  if (error) throw error;
  return data?.player_name ?? null;
}
