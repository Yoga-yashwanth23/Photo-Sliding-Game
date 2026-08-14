import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardService } from '@/services/leaderboardService';
import { usePlayerStore } from '@/store/playerStore';

/**
 * Replaces the old "Choose Your Captain Name" login form. There's no name
 * entry (and no client-side name generator) anymore — clicking "Get
 * Started" / "Set Sail" auto-registers a player and drops them straight
 * into /home. In Supabase mode, identity + display name come from the
 * shared Zephoria Supabase Auth session (see supabaseLeaderboardService's
 * registerPlayer) — this game does not log the user in itself, so it's
 * expected that a session already exists by the time this runs. Shared by
 * Landing's "Get Started" button and the Navbar's "Set Sail" button so
 * both entry points behave identically.
 */
export function useStartVoyage() {
  const [isStarting, setIsStarting] = useState(false);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const navigate = useNavigate();

  async function startVoyage() {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const player = await leaderboardService.registerPlayer('');
      setPlayer(player);
      navigate('/home');
    } catch (err) {
      // Most likely cause now: no active Zephoria session (see
      // registerPlayer). Logged so it's visible during integration/testing
      // rather than failing completely silently.
      // TODO: once you have a Zephoria login URL to send people to, redirect
      // here instead of just logging — e.g. window.location.href = ZEPHORIA_LOGIN_URL.
      // eslint-disable-next-line no-console
      console.error('[useStartVoyage] could not start voyage:', err);
    } finally {
      setIsStarting(false);
    }
  }

  return { startVoyage, isStarting };
}

