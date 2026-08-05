import { create } from 'zustand';
import type { Player } from '@/types';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants';
import { useGameStore } from '@/store/gameStore';

interface PlayerState {
  player: Player | null;
  setPlayer: (player: Player) => void;
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: storageService.get<Player>(STORAGE_KEYS.currentPlayer),
  setPlayer: (player) => {
    storageService.set(STORAGE_KEYS.currentPlayer, player);
    set({ player });
  },
  logout: () => {
    storageService.remove(STORAGE_KEYS.currentPlayer);
    useGameStore.getState().resetGame();
    set({ player: null });
  },
}));
