import { useCallback, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * Presentation-facing puzzle hook. Keeps keyboard handling and derived
 * values out of components, while all game rules stay in gameStore/utils.
 */
export function usePuzzle() {
  const { tiles, moves, isSolved, image, startedAt, solvedAt, moveTile } = useGameStore();

  const gridSize = tiles.length > 0 ? Math.sqrt(tiles.length) : 0;

  const handleTileClick = useCallback((tileId: number) => moveTile(tileId), [moveTile]);

  // Arrow-key support: moves the tile adjacent to the empty slot in the
  // pressed direction, satisfying keyboard-navigation accessibility.
  useEffect(() => {
    if (isSolved || tiles.length === 0) return;

    function onKeyDown(e: KeyboardEvent) {
      const empty = tiles.find((t) => t.isEmpty);
      if (!empty) return;

      const deltas: Record<string, [number, number]> = {
        ArrowUp: [1, 0],
        ArrowDown: [-1, 0],
        ArrowLeft: [0, 1],
        ArrowRight: [0, -1],
      };
      const delta = deltas[e.key];
      if (!delta) return;

      const targetRow = empty.row + delta[0];
      const targetCol = empty.col + delta[1];
      const target = tiles.find((t) => t.row === targetRow && t.col === targetCol);
      if (target) {
        e.preventDefault();
        moveTile(target.id);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tiles, isSolved, moveTile]);

  return { tiles, moves, isSolved, image, startedAt, solvedAt, gridSize, handleTileClick };
}
