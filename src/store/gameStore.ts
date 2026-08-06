import { create } from 'zustand';
import type { MoveQualityMetrics, PuzzleImage, Tile } from '@/types';
import { GRID_SIZE, MAX_MAP_REVEALS, STORAGE_KEYS } from '@/constants';
import { shuffleTiles } from '@/utils/shuffle';
import { storageService } from '@/services/storageService';

interface GameState {
  image: PuzzleImage | null;
  tiles: Tile[];
  moves: number;
  isSolved: boolean;
  startedAt: number | null;
  solvedAt: number | null;
  /** Tracks whether this completed run has already been sent to the leaderboard,
   *  so a page refresh after solving can't submit the same result twice. */
  hasSubmitted: boolean;
  finalRank: number | null;
  moveQuality: MoveQualityMetrics;
  lastMovedTileId: number | null;
  /** How many times the reference map has been revealed this attempt. Capped
   *  at MAX_MAP_REVEALS and persisted so a page refresh can't reset it. */
  revealsUsed: number;
  /** Increments on every startGame call. Lets UI components (like the map
   *  reveal panel) reset their own local state on "Play Again", even when
   *  the puzzle image itself stays the same. */
  attemptId: number;

  startGame: (image: PuzzleImage) => void;
  moveTile: (tileId: number) => void;
  resetGame: () => void;
  markSubmitted: (rank: number | null) => void;
  useReveal: () => boolean;
}

interface PersistedSession {
  playerId: string | null;
  image: PuzzleImage;
  tiles: Tile[];
  moves: number;
  isSolved: boolean;
  startedAt: number | null;
  solvedAt: number | null;
  hasSubmitted: boolean;
  finalRank: number | null;
  moveQuality: MoveQualityMetrics;
  lastMovedTileId: number | null;
  revealsUsed: number;
}

function isAdjacent(a: Tile, b: Tile): boolean {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return rowDiff + colDiff === 1;
}

function currentPlayerId(): string | null {
  return storageService.get<{ id: string }>(STORAGE_KEYS.currentPlayer)?.id ?? null;
}

function loadPersistedSession(): PersistedSession | null {
  const session = storageService.get<PersistedSession>(STORAGE_KEYS.gameSession);
  if (!session) return null;
  // Guard against resuming a different captain's in-progress voyage if the
  // browser is shared and someone else logs in on the same device.
  if (session.playerId !== currentPlayerId()) {
    storageService.remove(STORAGE_KEYS.gameSession);
    return null;
  }
  return session;
}

function persistSession(state: GameState) {
  if (!state.image) {
    storageService.remove(STORAGE_KEYS.gameSession);
    return;
  }
  const session: PersistedSession = {
    playerId: currentPlayerId(),
    image: state.image,
    tiles: state.tiles,
    moves: state.moves,
    isSolved: state.isSolved,
    startedAt: state.startedAt,
    solvedAt: state.solvedAt,
    hasSubmitted: state.hasSubmitted,
    finalRank: state.finalRank,
    moveQuality: state.moveQuality,
    lastMovedTileId: state.lastMovedTileId,
    revealsUsed: state.revealsUsed,
  };
  storageService.set(STORAGE_KEYS.gameSession, session);
}

// Resume an in-progress (or just-finished) voyage on load — e.g. after a page
// refresh — instead of always starting from a blank slate. The timer keeps
// counting correctly on its own because it derives elapsed time from
// `startedAt`, which is preserved here untouched.
const restored = loadPersistedSession();

export const useGameStore = create<GameState>((set, get) => ({
  image: restored?.image ?? null,
  tiles: restored?.tiles ?? [],
  moves: restored?.moves ?? 0,
  isSolved: restored?.isSolved ?? false,
  startedAt: restored?.startedAt ?? null,
  solvedAt: restored?.solvedAt ?? null,
  hasSubmitted: restored?.hasSubmitted ?? false,
  finalRank: restored?.finalRank ?? null,
  moveQuality: restored?.moveQuality ?? { productiveMoves: 0, repeatedMoves: 0, reversals: 0, correctPlacements: 0 },
  lastMovedTileId: restored?.lastMovedTileId ?? null,
  revealsUsed: restored?.revealsUsed ?? 0,
  attemptId: 0,

  startGame: (image) => {
    const next: GameState = {
      ...get(),
      image,
      tiles: shuffleTiles(GRID_SIZE),
      moves: 0,
      isSolved: false,
      startedAt: null,
      solvedAt: null,
      hasSubmitted: false,
      finalRank: null,
      moveQuality: { productiveMoves: 0, repeatedMoves: 0, reversals: 0, correctPlacements: 0 },
      lastMovedTileId: null,
      revealsUsed: 0,
      attemptId: get().attemptId + 1,
    };
    set(next);
    persistSession(next);
  },

  moveTile: (tileId) => {
    const { tiles, isSolved } = get();
    if (isSolved) return;

    const emptyTile = tiles.find((t) => t.isEmpty);
    const targetTile = tiles.find((t) => t.id === tileId);
    if (!emptyTile || !targetTile || targetTile.isEmpty) return;
    if (!isAdjacent(emptyTile, targetTile)) return;

    const nextTiles = tiles.map((t) => ({ ...t }));
    const empty = nextTiles.find((t) => t.isEmpty)!;
    const target = nextTiles.find((t) => t.id === tileId)!;

    const emptyRow = empty.row;
    const emptyCol = empty.col;
    const beforeDistance = Math.abs(target.row - target.correctRow) + Math.abs(target.col - target.correctCol);
    empty.row = target.row;
    empty.col = target.col;
    target.row = emptyRow;
    target.col = emptyCol;

    const afterDistance = Math.abs(target.row - target.correctRow) + Math.abs(target.col - target.correctCol);
    const wasReversal = get().lastMovedTileId === tileId;
    const previousQuality = get().moveQuality;
    const nextQuality: MoveQualityMetrics = {
      productiveMoves: previousQuality.productiveMoves + (afterDistance < beforeDistance ? 1 : 0),
      repeatedMoves: previousQuality.repeatedMoves + (wasReversal ? 1 : 0),
      reversals: previousQuality.reversals + (wasReversal ? 1 : 0),
      correctPlacements: previousQuality.correctPlacements + (afterDistance === 0 ? 1 : 0),
    };

    const solved = nextTiles.every((t) => t.row === t.correctRow && t.col === t.correctCol);

    const next: GameState = {
      ...get(),
      tiles: nextTiles,
      moves: get().moves + 1,
      isSolved: solved,
      startedAt: get().startedAt ?? Date.now(),
      solvedAt: solved ? Date.now() : null,
      moveQuality: nextQuality,
      lastMovedTileId: tileId,
    };
    set(next);
    persistSession(next);
  },

  markSubmitted: (rank) => {
    const next: GameState = { ...get(), hasSubmitted: true, finalRank: rank };
    set(next);
    persistSession(next);
  },

  /** Attempts to spend one map reveal. Returns whether it was allowed, so the
   *  caller only shows the image when a reveal was actually granted. */
  useReveal: () => {
    const { revealsUsed } = get();
    if (revealsUsed >= MAX_MAP_REVEALS) return false;
    const next: GameState = { ...get(), revealsUsed: revealsUsed + 1 };
    set(next);
    persistSession(next);
    return true;
  },

  resetGame: () => {
    const next: GameState = {
      ...get(),
      image: null,
      tiles: [],
      moves: 0,
      isSolved: false,
      startedAt: null,
      solvedAt: null,
      hasSubmitted: false,
      finalRank: null,
      moveQuality: { productiveMoves: 0, repeatedMoves: 0, reversals: 0, correctPlacements: 0 },
      lastMovedTileId: null,
      revealsUsed: 0,
    };
    set(next);
    storageService.remove(STORAGE_KEYS.gameSession);
  },
}));
