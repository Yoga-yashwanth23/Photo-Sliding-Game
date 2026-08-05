import { useNavigate } from 'react-router-dom';
import type { PuzzleImage } from '@/types';
import { GRID_SIZE } from '@/constants';

interface MapCardProps {
  image: PuzzleImage;
}

export default function MapCard({ image }: MapCardProps) {
  const navigate = useNavigate();

  return (
    <div className="plank-panel flex flex-col overflow-hidden">
      <div className="aspect-square w-full overflow-hidden border-b border-gold/30">
        <img
          src={image.path}
          alt={`Puzzle preview: ${image.name}`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-xl text-gold">{image.name}</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm text-foam/80">
          <dt className="font-heading">Grid</dt>
          <dd className="font-mono">{GRID_SIZE} × {GRID_SIZE}</dd>
        </dl>
        <button onClick={() => navigate(`/game/${image.id}`)} className="btn-gold mt-auto">
          Play {image.name}
        </button>
      </div>
    </div>
  );
}
