import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Cross-origin session handoff (Option A).
 *
 * The main site links here as:
 *   https://<game-origin>/login?access_token=...&refresh_token=...
 *
 * Supabase Auth sessions are stored per-origin (localStorage on whichever
 * domain the SDK runs on), so a session established on the main site's
 * origin doesn't exist on the game's origin. Handing the tokens over via
 * query params and calling `supabase.auth.setSession()` here establishes an
 * equivalent session on the game's origin, so `auth.uid()` is populated for
 * any RLS-scoped Supabase calls the game makes afterwards (see the caveat
 * in supabaseLeaderboardService.ts's registerPlayer()).
 *
 * Tokens in a URL are readable via browser history and any Referer header
 * sent from this page — acceptable for many setups, but worth knowing. To
 * limit the exposure window, the caller should strip these params from the
 * URL as soon as they're read, before this function's promise even
 * resolves — see consumeUrlParams() below.
 */

export interface HandoffTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Reads access_token/refresh_token out of the current URL's query string.
 * Pure/synchronous and has no side effects on the URL itself — call
 * stripHandoffParamsFromUrl() separately once you're done reading them.
 */
export function readHandoffTokensFromUrl(): HandoffTokens | null {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Removes access_token/refresh_token (and nothing else) from the current
 * URL's query string via history.replaceState, so they stop showing up in
 * the address bar and don't get carried along if the page later reloads or
 * the URL gets shared/bookmarked. Uses replaceState (not pushState) so this
 * cleanup doesn't add a back-button entry containing the tokens.
 */
export function stripHandoffParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('access_token') && !url.searchParams.has('refresh_token')) return;
  url.searchParams.delete('access_token');
  url.searchParams.delete('refresh_token');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Full handoff flow: read tokens from the URL, immediately scrub them from
 * the URL regardless of outcome, then (if present and Supabase is
 * configured) exchange them for a session on this origin via
 * `supabase.auth.setSession()`.
 *
 * Returns true if a session was successfully established from handed-off
 * tokens, false otherwise (no tokens present, Supabase not configured, or
 * the exchange failed — e.g. expired/invalid tokens). Callers should treat
 * `false` as "fall back to the normal login flow", not as an error to
 * surface to the player.
 */
export async function establishSessionFromUrl(): Promise<boolean> {
  const tokens = readHandoffTokensFromUrl();

  // Strip first, before the (async) setSession call, so the tokens spend as
  // little time as possible sitting in the visible URL.
  stripHandoffParamsFromUrl();

  if (!tokens || !isSupabaseConfigured) return false;

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[sessionHandoff] could not establish session from handed-off tokens:', error);
    return false;
  }

  return true;
}
