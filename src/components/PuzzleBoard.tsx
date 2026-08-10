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
// Matches the plank-panel's `p-4` (1rem = 16px) on both sides.
const PANEL_PADDING_PX = 32;

export default function PuzzleBoard({ tiles, gridSize, imagePath, onTileClick }: PuzzleBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // panelSize is the TOTAL outer footprint of the wooden panel (including
  // its own padding) — this is what must fit inside the available space.
  const [panelSize, setPanelSize] = useState(360);

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      // containerRef's width is the actual space we have to work with, so
      // the panel (border + padding included) must never exceed it — sizing
      // it any larger is what pushes the board past the screen edge on
      // narrow/mobile viewports.
      const available = Math.min(
        containerRef.current.offsetWidth,
        window.innerHeight * 0.62,
        640,
      );
      setPanelSize(Math.max(available, PANEL_PADDING_PX + gridSize * 24));
    }
    measure();

    // ResizeObserver catches container-size changes that a plain window
    // resize listener misses (e.g. sidebar/orientation/layout shifts),
    // which matters most on mobile.
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize]);

  // The grid itself only gets the space left over once the panel's own
  // padding is subtracted — this is the piece that was missing before.
  const boardSize = panelSize - PANEL_PADDING_PX;
  const tileSizePx = (boardSize - GAP_PX * (gridSize - 1)) / gridSize;

  // Generated once when the board mounts (i.e. fresh every time the app is
  // loaded/run) — deliberately not derived from tile.id/correctRow/correctCol
  // and never persisted, so it can't be used to infer a tile's home position.
  const displayLabels = useMemo(() => buildDisplayLabelMap(gridSize * gridSize), [gridSize]);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-3xl px-1 sm:px-0">
      <div className="plank-panel relative mx-auto max-w-full p-4" style={{ width: panelSize }}>
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
