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

// createClient() throws synchronously ("supabaseUrl is required.") if given
// an empty string — and this file is imported unconditionally by
// leaderboardService.ts, so that throw happens at module-load time, before
// React ever renders. That crashes the whole app to a blank screen with no
// error boundary able to catch it. Falling back to a syntactically-valid
// placeholder avoids the crash; the client is never actually called against
// it because leaderboardService.ts only uses SupabaseLeaderboardService when
// isSupabaseConfigured is true.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-anon-key');
