import { motion } from 'framer-motion';
import type { Tile } from '@/types';

interface PuzzleTileProps {
  tile: Tile;
  gridSize: number;
  imagePath: string;
  tileSizePx: number;
  onClick: (id: number) => void;
  /** Random per-tile number, unrelated to the tile's correct position. */
  displayLabel: number;
}

export default function PuzzleTile({ tile, gridSize, imagePath, tileSizePx, onClick, displayLabel }: PuzzleTileProps) {
  if (tile.isEmpty) {
    return (
      <div
        className="rounded-md border border-dashed border-gold/15"
        style={{
          gridRowStart: tile.row + 1,
          gridColumnStart: tile.col + 1,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onClick(tile.id)}
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      style={{
        gridRowStart: tile.row + 1,
        gridColumnStart: tile.col + 1,
        // Encode + quote the URL so filenames with spaces or other special
        // characters (e.g. "900 1.png") never silently fail to render —
        // an unquoted CSS url() cannot contain a literal space.
        backgroundImage: `url("${encodeURI(imagePath)}")`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        backgroundPosition: `${(tile.correctCol * 100) / (gridSize - 1)}% ${(tile.correctRow * 100) / (gridSize - 1)}%`,
        width: tileSizePx,
        height: tileSizePx,
      }}
      className="rounded-md border border-gold/40 shadow-md transition-transform hover:scale-[1.02] hover:border-gold focus-visible:scale-[1.02]"
      aria-label={`${displayLabel}`}
    />
  );
}
