import { useEffect, useState } from 'react';
import type { PuzzleImage } from '@/types';
import { usePlayerStore } from '@/store/playerStore';
import MapCarousel from '@/components/MapCarousel';
import { pickRandom } from '@/utils/pickRandom';

export default function Home() {
  const player = usePlayerStore((s) => s.player);
  const [images, setImages] = useState<PuzzleImage[]>([]);

  useEffect(() => {
    fetch('/images/images.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      // Show every map that's in public/images, just in a freshly shuffled
      // order each visit — pickRandom(all, all.length) returns the whole
      // list, randomized, rather than a fixed-size subset.
      .then((all: PuzzleImage[]) => setImages(pickRandom(all, all.length)))
      .catch(() => setImages([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-center text-3xl">Chart Your Voyage, {player?.name}</h1>
      <p className="mb-10 text-center text-foam/70">Scroll sideways to browse the maps, then play the one you land on.</p>

      <MapCarousel images={images} />
    </div>
  );
}
