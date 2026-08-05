import type { Tile } from '@/types';
import { isSolvable } from './solvable';

/**
 * Builds the solved tile layout for a given grid size.
 * Tile ids 0..n*n-2 are real tiles, the last cell is the empty slot.
 *
 * `id` stays sequential (row-major) because game logic depends on it being a
 * stable, predictable key — but it must never be surfaced to the DOM, since
 * id === correctRow * gridSize + correctCol would let anyone reveal a tile's
 * solved position just by inspecting the page. The number actually shown to
 * players/assistive tech is generated separately (see utils/displayLabels.ts)
 * at render time, so it's never persisted and is freshly randomized every
 * time the app runs.
 */
export function buildSolvedTiles(gridSize: number): Tile[] {
  const tiles: Tile[] = [];
  const total = gridSize * gridSize;
  for (let index = 0; index < total; index++) {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const isEmpty = index === total - 1;
    tiles.push({ id: index, correctRow: row, correctCol: col, row, col, isEmpty });
  }
  return tiles;
}

function toBoard(tiles: Tile[], gridSize: number): number[] {
  const board = new Array(gridSize * gridSize).fill(0);
  for (const tile of tiles) {
    const flatIndex = tile.row * gridSize + tile.col;
    // Home position 1..n*n-1 for real tiles, 0 for the empty slot, matching
    // the convention expected by isSolvable().
    board[flatIndex] = tile.isEmpty ? 0 : tile.id + 1;
  }
  return board;
}

function getAdjacentIndices(index: number, gridSize: number): number[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const neighbours: number[] = [];
  if (row > 0) neighbours.push(index - gridSize);
  if (row < gridSize - 1) neighbours.push(index + gridSize);
  if (col > 0) neighbours.push(index - 1);
  if (col < gridSize - 1) neighbours.push(index + 1);
  return neighbours;
}

/**
 * Shuffles by performing a long sequence of *legal* random slides starting
 * from the solved board. This guarantees the result is always reachable
 * (hence solvable) without needing to reject/retry random permutations, and
 * avoids the "reverse the previous move" oscillation that produces
 * under-mixed puzzles.
 */
export function shuffleTiles(gridSize: number, minMoves = gridSize * gridSize * 25): Tile[] {
  const tiles = buildSolvedTiles(gridSize);
  const positionOf = (row: number, col: number) => tiles.find((t) => t.row === row && t.col === col)!;

  let emptyIndex = tiles.findIndex((t) => t.isEmpty);
  let lastMovedTileId = -1;

  for (let step = 0; step < minMoves; step++) {
    const empty = tiles[emptyIndex];
    const flatEmptyIndex = empty.row * gridSize + empty.col;
    const candidateFlatIndices = getAdjacentIndices(flatEmptyIndex, gridSize).filter((flatIdx) => {
      const row = Math.floor(flatIdx / gridSize);
      const col = flatIdx % gridSize;
      const candidate = positionOf(row, col);
      return candidate.id !== lastMovedTileId;
    });

    const pool = candidateFlatIndices.length > 0
      ? candidateFlatIndices
      : getAdjacentIndices(flatEmptyIndex, gridSize);

    const chosenFlat = pool[Math.floor(Math.random() * pool.length)];
    const chosenRow = Math.floor(chosenFlat / gridSize);
    const chosenCol = chosenFlat % gridSize;
    const chosenTile = positionOf(chosenRow, chosenCol);

    // Swap the chosen tile into the empty slot.
    const emptyRow = empty.row;
    const emptyCol = empty.col;
    chosenTile.row = emptyRow;
    chosenTile.col = emptyCol;
    empty.row = chosenRow;
    empty.col = chosenCol;

    lastMovedTileId = chosenTile.id;
    emptyIndex = tiles.findIndex((t) => t.isEmpty);
  }

  // Defensive check: guarantee the produced board is solvable and not a
  // trivially-already-solved board. Falls back to reshuffling if not.
  const board = toBoard(tiles, gridSize);
  const alreadySolved = tiles.every((t) => t.row === t.correctRow && t.col === t.correctCol);
  if (!isSolvable(board, gridSize) || alreadySolved) {
    return shuffleTiles(gridSize, minMoves);
  }

  return tiles;
}
