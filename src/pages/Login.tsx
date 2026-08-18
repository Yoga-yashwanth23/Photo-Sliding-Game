import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompassLoader from '@/components/CompassLoader';
import NameSetupForm from '@/components/NameSetupForm';
import { supabase, isSupabaseConfigured } from '@/services/supabaseClient';
import { establishSessionFromUrl } from '@/services/sessionHandoff';
import { fetchGamerProfile, createGamerProfile } from '@/services/gamerProfileService';
import { usePlayerStore } from '@/store/playerStore';

type Status = 'checking' | 'needs-name' | 'signed-out';

/**
 * This route is no longer a form the player fills out to "log in" — the
 * main site owns email/password entirely. Its "Play Now" link points here
 * with ?access_token/&refresh_token (see services/sessionHandoff.ts), and
 * from here the flow is fully automatic:
 *
 *   1. Turn those tokens into a real Supabase Auth session on this origin.
 *   2. Look up whether this authenticated user already has a saved captain
 *      name in `gamer_profile`.
 *        - Yes -> load it and go straight to /home. Nothing is asked.
 *        - No  -> ask once (NameSetupForm), save it permanently, then go
 *          to /home. This only ever happens the very first time a given
 *          website account opens the game.
 *
 * Revisiting this URL later (e.g. the main site links here again on every
 * "Play Now" click, per the session-handoff plan) re-runs the same check
 * and — since the profile now exists — skips straight past the form.
 *
 * If someone lands here with no tokens and no existing Supabase session
 * (e.g. opened this URL directly rather than via the main site), there's
 * nothing to bootstrap from, so a short message is shown instead of a form.
 */
export default function Login() {
  const [status, setStatus] = useState<Status>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!isSupabaseConfigured) {
        // Local/no-backend dev fallback: there's no gamer_profile table to
        // check or save to, so don't strand the page on a spinner — just
        // say so.
        if (!cancelled) setStatus('signed-out');
        return;
      }

      // Consumes ?access_token/&refresh_token if the main site just handed
      // them over, stripping them from the URL either way. If they're not
      // present, this is a no-op and getSession() below falls back to
      // whatever session the Supabase SDK already has persisted from an
      // earlier visit.
      await establishSessionFromUrl();
      if (cancelled) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        setStatus('signed-out');
        return;
      }

      setUserId(session.user.id);
      const profile = await fetchGamerProfile(session.user.id);
      if (cancelled) return;

      if (profile) {
        setPlayer(profile);
        navigate('/home', { replace: true });
      } else {
        setStatus('needs-name');
      }
    }

    bootstrap().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[Login] could not bootstrap session/profile:', err);
      if (!cancelled) setStatus('signed-out');
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSubmit = useCallback(
    async (name: string) => {
      if (!userId) return;
      const profile = await createGamerProfile(userId, name);
      setPlayer(profile);
      navigate('/home', { replace: true });
    },
    [userId, setPlayer, navigate],
  );

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
      {status === 'checking' && <CompassLoader label="Coming Aboard…" />}

      {status === 'needs-name' && <NameSetupForm onSubmit={handleNameSubmit} />}

      {status === 'signed-out' && (
        <div className="parchment-panel w-full max-w-md p-8 text-center sm:p-10">
          <h1 className="font-display text-3xl">Not Signed In</h1>
          <p className="mt-4 text-sm text-abyss/70">
            Please sign in from the main site, then open the game from there.
          </p>
        </div>
      )}
    </div>
  );
}
