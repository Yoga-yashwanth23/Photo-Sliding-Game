import { create } from 'zustand';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants';
import { supabase } from '@/services/supabaseClient';
import { getAuthUser, fetchPlayerName } from '@/services/gamerProfileService';

/**
 * Player identity comes entirely from the shared Zephoria session +
 * `gamer_profile` — never trusted from localStorage on this device. This
 * game never asks for a captain name itself; it only ever reads one that's
 * already on record. Login/logout/session lifetime, and setting the name in
 * the first place, are owned by the main website — not this game.
 *
 * The one exception: once identity is resolved, the player's id is also
 * mirrored into `storageService` under STORAGE_KEYS.currentPlayer, purely
 * so gameStore.ts can tell "is this shared device's in-progress puzzle
 * session still for the same captain" apart from "a different Zephoria
 * account logged in on this device" — that check runs synchronously before
 * this store can be awaited, so it needs a cheap local copy. It is never
 * read back as a source of truth for who's playing.
 *
 * `status` drives what App.tsx / RequireCaptain show:
 *   - 'loading'         initial check in flight, or a refresh after auth change
 *   - 'signed-out'      no Supabase Auth session — the user needs to log in
 *                        on the main website
 *   - 'profile-missing' signed in, but no gamer_profile row exists for this
 *                        user yet. This game does not create one — it's a
 *                        configuration/ordering problem elsewhere in
 *                        Zephoria (see the message shown on /login).
 *   - 'ready'            signed in and named — `player` is populated, game
 *                        tabs and the leaderboard can be used normally
 */
export type PlayerStatus = 'loading' | 'signed-out' | 'profile-missing' | 'ready';

interface PlayerState {
  status: PlayerStatus;
  player: Player | null;
  /** Re-checks the Supabase Auth session and gamer_profile row from scratch. */
  refresh: () => Promise<void>;
  /** Ends the shared Zephoria session (signs the user out of the whole site, not just this game). */
  logout: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  status: 'loading',
  player: null,

  refresh: async () => {
    set({ status: 'loading' });
    const authUser = await getAuthUser();
    if (!authUser) {
      storageService.remove(STORAGE_KEYS.currentPlayer);
      set({ status: 'signed-out', player: null });
      return;
    }

    const playerName = await fetchPlayerName(authUser.id);
    if (!playerName) {
      storageService.remove(STORAGE_KEYS.currentPlayer);
      set({ status: 'profile-missing', player: null });
      return;
    }

    storageService.set(STORAGE_KEYS.currentPlayer, { id: authUser.id });
    set({
      status: 'ready',
      player: { id: authUser.id, name: playerName, normalisedName: playerName.trim().toLowerCase(), createdAt: 0 },
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    useGameStore.getState().resetGame();
    storageService.remove(STORAGE_KEYS.currentPlayer);
    set({ status: 'signed-out', player: null });
  },
}));

// Keep this store in sync with the shared session automatically — if the
// website logs the user out (or a token refresh fails) in another tab, this
// game should drop back to 'signed-out' rather than keep showing stale
// player data.
supabase.auth.onAuthStateChange(() => {
  usePlayerStore.getState().refresh();
});
