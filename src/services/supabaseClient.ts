import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether Supabase is configured for this build. `leaderboardService.ts`
 * checks this to decide between `SupabaseLeaderboardService` and the
 * original `LocalLeaderboardService`, so the app still runs with zero
 * configuration if the env vars aren't set (e.g. a fresh clone, or CI).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — falling back to the local (device-only) leaderboard. See .env.example.',
  );
}

// Safe to construct even with empty strings when not configured: the
// client is simply never used in that case (see leaderboardService.ts).
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
