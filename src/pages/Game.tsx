import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PuzzleImage } from '@/types';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { usePuzzle } from '@/hooks/usePuzzle';
import { useTimer } from '@/hooks/useTimer';
import { calculatePerformance } from '@/utils/scoringEngine';
import { leaderboardService } from '@/services/leaderboardService';
import PuzzleBoard from '@/components/PuzzleBoard';
import GameHeader from '@/components/GameHeader';
import CompletionModal from '@/components/CompletionModal';
import CompassLoader from '@/components/CompassLoader';
import ConfirmModal from '@/components/ConfirmModal';

export default function Game() {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const player = usePlayerStore((s) => s.player);
  const startGame = useGameStore((s) => s.startGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const hasSubmitted = useGameStore((s) => s.hasSubmitted);
  const finalRank = useGameStore((s) => s.finalRank);
  const markSubmitted = useGameStore((s) => s.markSubmitted);
  const { submitResult } = useLeaderboardStore();
  const [images, setImages] = useState<PuzzleImage[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isPersonalBest, setIsPersonalBest] = useState(false);

  const selectedImageId = imageId ? Number(imageId) : null;

  const moveQuality = useGameStore((s) => s.moveQuality);
  const { tiles, moves, isSolved, gridSize, image, solvedAt, startedAt, handleTileClick } = usePuzzle();
  const elapsedMs = useTimer(startedAt, solvedAt);
  const performance = useMemo(
    () => calculatePerformance(elapsedMs, moves, moveQuality),
    [elapsedMs, moves, moveQuality],
  );

  useEffect(() => {
    fetch('/images/images.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setImages)
      .catch(() => setImages([]));
  }, []);

  useEffect(() => {
    if (!selectedImageId || images.length === 0) return;
    const puzzleImage = images.find((img) => img.id === selectedImageId);
    if (!puzzleImage) return;

    // Only start a brand-new voyage when there isn't already a live/finished
    // session for this exact map. This is what makes a page refresh resume
    // instead of reset: the store rehydrates its persisted session first
    // (see gameStore.ts), so on remount `image` already matches and nothing
    // here re-shuffles the board or restarts the clock.
    const current = useGameStore.getState();
    if (!current.image || current.image.id !== puzzleImage.id) {
      startGame(puzzleImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageId, images.length]);

  useEffect(() => {
    async function persist() {
      if (!isSolved || hasSubmitted || !player) return;
      const previousStats = await leaderboardService.getPlayerStatistics(player.id);
      const saved = await submitResult({
        playerId: player.id,
        playerName: player.name,
        completionTimeMs: elapsedMs,
        moves,
        finalScore: performance.finalScore,
        expectedMinimumMoves: performance.expectedMinimumMoves,
        moveEfficiency: performance.moveEfficiency,
        timeScore: performance.timeScore,
        accuracyScore: performance.accuracyScore,
        pirateRank: performance.pirateRank,
        letterGrade: performance.letterGrade,
        completedAt: Date.now(),
      });
      setIsPersonalBest(!previousStats || performance.finalScore > previousStats.personalBestScore);
      markSubmitted(saved?.rank ?? null);
    }
    persist();
  }, [isSolved, hasSubmitted, player, elapsedMs, moves, performance, submitResult, markSubmitted]);

  function handleEndGame() {
    setShowEndConfirm(true);
  }

  function handleConfirmEndGame() {
    setShowEndConfirm(false);
    // Navigate first, then clear the puzzle state. Doing it in this order
    // means the route change (and the Game page unmounting) happens before
    // the board is emptied out, instead of racing with it. The previous
    // implementation used the native window.confirm() dialog, which — on
    // some browsers, especially mobile — can leave React Router's pending
    // transition stuck until a manual refresh: the blocking dialog resumes
    // outside the click event React was batching, so the resetGame() +
    // navigate() calls right after it were no longer guaranteed to land in
    // the same update. Using a normal in-app modal instead keeps everything
    // inside ordinary React event handling, so the navigation always takes.
    navigate('/home');
    resetGame();
  }

  if (!selectedImageId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="mb-4 text-foam/80">Unknown map. Choose one from Home.</p>
        <button onClick={() => navigate('/home')} className="btn-gold">
          Back to Home
        </button>
      </div>
    );
  }

  if (!image || tiles.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CompassLoader label="Charting the waters…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <GameHeader
        playerName={player?.name ?? 'Unknown'}
        elapsedMs={elapsedMs}
        moves={moves}
        points={performance.finalScore}
        isSolved={isSolved}
        rank={finalRank}
        onEndGame={handleEndGame}
      />

      <PuzzleBoard tiles={tiles} gridSize={gridSize} imagePath={image.path} onTileClick={handleTileClick} />

      {isSolved && (
        <CompletionModal
          completionTimeMs={elapsedMs}
          moves={moves}
          performance={performance}
          rank={finalRank}
          isPersonalBest={isPersonalBest}
          onPlayAgain={() => {
            const puzzleImage = images.find((img) => img.id === selectedImageId);
            if (puzzleImage) startGame(puzzleImage);
          }}
        />
      )}

      <ConfirmModal
        open={showEndConfirm}
        title="End this voyage?"
        message="You'll return to Home and your progress on this puzzle will be lost."
        confirmLabel="End Voyage"
        cancelLabel="Keep Sailing"
        onConfirm={handleConfirmEndGame}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  );
}
