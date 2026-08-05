import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tile } from '@/types';
import PuzzleTile from './PuzzleTile';
import { buildDisplayLabelMap } from '@/utils/displayLabels';

interface PuzzleBoardProps {
  tiles: Tile[];
  gridSize: number;
  imagePath: string;
  onTileClick: (id: number) => void;
}

const GAP_PX = 6;

export default function PuzzleBoard({ tiles, gridSize, imagePath, onTileClick }: PuzzleBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(360);

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const available = Math.min(containerRef.current.offsetWidth, window.innerHeight * 0.62, 640);
      setBoardSize(available);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const tileSizePx = (boardSize - GAP_PX * (gridSize - 1)) / gridSize;

  // Generated once when the board mounts (i.e. fresh every time the app is
  // loaded/run) — deliberately not derived from tile.id/correctRow/correctCol
  // and never persisted, so it can't be used to infer a tile's home position.
  const displayLabels = useMemo(() => buildDisplayLabelMap(gridSize * gridSize), [gridSize]);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-2xl">
      <div className="plank-panel relative mx-auto p-4" style={{ width: boardSize + 32 }}>
        {/* Torn treasure-map corner accents */}
        <span className="absolute -top-2 -left-2 h-6 w-6 rotate-45 bg-abyss border-b border-r border-gold/40" />
        <span className="absolute -top-2 -right-2 h-6 w-6 -rotate-45 bg-abyss border-b border-l border-gold/40" />
        <div
          className="mx-auto grid"
          style={{
            width: boardSize,
            height: boardSize,
            gridTemplateColumns: `repeat(${gridSize}, ${tileSizePx}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${tileSizePx}px)`,
            gap: GAP_PX,
          }}
          role="group"
          aria-label="Sliding puzzle board"
        >
          {tiles.map((tile) => (
            <PuzzleTile
              key={tile.id}
              tile={tile}
              gridSize={gridSize}
              imagePath={imagePath}
              tileSizePx={tileSizePx}
              onClick={onTileClick}
              displayLabel={displayLabels.get(tile.id) ?? 0}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-foam/60">
        Click a tile beside the empty slot, or use the arrow keys, to slide it into place.
      </p>
    </div>
  );
}
