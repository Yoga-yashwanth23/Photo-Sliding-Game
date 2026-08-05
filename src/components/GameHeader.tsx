import { useState } from 'react';
import Timer from './Timer';
import MoveCounter from './MoveCounter';
import PointsBoard from './PointsBoard';

interface GameHeaderProps {
  playerName: string;
  elapsedMs: number;
  moves: number;
  points: number;
  isSolved: boolean;
  rank: number | null;
  onEndGame: () => void;
}

export default function GameHeader({
  playerName,
  elapsedMs,
  moves,
  points,
  isSolved,
  rank,
  onEndGame,
}: GameHeaderProps) {
  const [rankRevealed, setRankRevealed] = useState(false);

  return (
    <div className="plank-panel mx-auto mb-6 flex max-w-2xl flex-col items-stretch gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
      <div>
        <p className="font-heading text-lg text-gold">⚓ {playerName}</p>
        <p className="text-xs uppercase tracking-widest text-foam/60">Voyage in progress</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <Timer elapsedMs={elapsedMs} />
        <MoveCounter moves={moves} />
        <PointsBoard points={points} />

        {/* Rank stays hidden during play. Once the puzzle is solved, a button
            appears here so the player can reveal it on demand instead of it
            being shown automatically while sliding tiles. */}
        {isSolved && (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setRankRevealed((v) => !v)}
              className="rounded-md border border-gold/60 px-3 py-2 font-heading text-sm text-gold tracking-wide transition-colors hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              aria-expanded={rankRevealed}
            >
              🏆 {rankRevealed ? (rank ? `#${rank}` : '—') : 'View Rank'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onEndGame}
          className="rounded-md border border-rust/60 px-3 py-2 font-heading text-sm text-rust tracking-wide transition-colors hover:bg-rust/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
          aria-label="End voyage and return to home"
          title="End voyage and return to home"
        >
          ⛔ End Voyage
        </button>
      </div>
    </div>
  );
}
