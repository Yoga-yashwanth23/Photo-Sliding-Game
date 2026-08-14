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

// createClient throws synchronously if the URL doesn't look like a valid
// URL — passing '' crashes the whole app on load even when Supabase isn't
// configured (leaderboardService.ts falls back to LocalLeaderboardService
// in that case and never touches this client). Use harmless placeholder
// values so construction always succeeds; the client is simply never
// called when isSupabaseConfigured is false.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);
