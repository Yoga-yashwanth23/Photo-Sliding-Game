import { Navigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import CompassLoader from '@/components/CompassLoader';

/**
 * No name form here — this game never collects a captain name, only reads
 * one already on record (see playerStore.ts / gamerProfileService.ts). This
 * route is purely a status screen for the two cases where the game can't
 * proceed to /home on its own:
 *   - 'loading'         brief spinner while the session/profile check runs
 *   - 'signed-out'      no Supabase Auth session — send the player back to
 *                        the main website to log in there
 *   - 'profile-missing' signed in, but Zephoria never created a
 *                        gamer_profile row for this account — not something
 *                        this game can fix; point the player at support
 *   - 'ready'            nothing to do here, go straight to /home
 */
export default function Login() {
  const status = usePlayerStore((s) => s.status);

  if (status === 'ready') return <Navigate to="/home" replace />;

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
      {status === 'loading' && <CompassLoader label="Checking your papers…" />}

      {status === 'signed-out' && (
        <div className="parchment-panel w-full max-w-md p-8 text-center sm:p-10">
          <h1 className="font-display text-3xl">Sign In Required</h1>
          <p className="mt-4 text-sm text-abyss/70">
            You need to be logged in to Zephoria to play. Please sign in on the main site, then come back to the
            game tab.
          </p>
        </div>
      )}

      {status === 'profile-missing' && (
        <div className="parchment-panel w-full max-w-md p-8 text-center sm:p-10">
          <h1 className="font-display text-3xl">Captain Not Found</h1>
          <p className="mt-4 text-sm text-abyss/70">
            We couldn't find a crew profile for your account yet. This usually clears up on its own — try
            refreshing in a moment, or reach out to support if it keeps happening.
          </p>
        </div>
      )}
    </div>
  );
}
