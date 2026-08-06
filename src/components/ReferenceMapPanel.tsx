import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ReferenceMapPanelProps {
  imagePath: string;
  revealsUsed: number;
  maxReveals: number;
  /** Attempts to spend a reveal in the game store. Returns whether it was granted. */
  onReveal: () => boolean;
}

/** How long a revealed map stays visible before it automatically hides itself again. */
const AUTO_HIDE_MS = 4000;

/**
 * A side panel that lets the player peek at the finished map while solving
 * the puzzle — but only a limited number of times per attempt. Hiding an
 * already-revealed image is free; only the act of revealing it counts
 * against the limit. Every reveal auto-hides itself after a few seconds,
 * so a peek always stays a peek.
 */
export default function ReferenceMapPanel({ imagePath, revealsUsed, maxReveals, onReveal }: ReferenceMapPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const revealsLeft = Math.max(maxReveals - revealsUsed, 0);
  const canReveal = revealsLeft > 0;

  // Whenever the map becomes visible — for the 1st reveal, the 2nd, any of
  // them — start a timer that hides it again on its own. Clearing the timer
  // on cleanup means a manual "Hide Map" click (or the panel remounting for
  // a fresh attempt) cancels any timer left over from the previous reveal.
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => setIsVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [isVisible]);

  function handleClick() {
    if (isVisible) {
      setIsVisible(false);
      return;
    }
    if (onReveal()) {
      setIsVisible(true);
    }
  }

  return (
    <div className="plank-panel mx-auto w-full max-w-xs p-5 lg:mx-0 lg:w-[19rem] lg:max-w-none">
      <p className="mb-3 text-center font-heading text-base uppercase tracking-widest text-gold">🗺️ Reference Map</p>

      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-md border border-gold/30 bg-abyss/60">
        <AnimatePresence mode="wait">
          {isVisible ? (
            <motion.img
              key="revealed"
              src={imagePath}
              alt="Completed treasure map"
              className="h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          ) : (
            <motion.div
              key="hidden"
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-foam/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="text-4xl">🔒</span>
              <span className="px-2 text-sm">Hidden until revealed</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={!isVisible && !canReveal}
        className="btn-outline mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {isVisible ? 'Hide Map' : canReveal ? 'Reveal Map' : 'No Reveals Left'}
      </button>

      <p className="mt-2 text-center text-xs text-foam/50">
        {canReveal
          ? `${revealsLeft} of ${maxReveals} reveals left — each peek lasts 4 seconds`
          : 'You have used all your reveals for this voyage'}
      </p>
    </div>
  );
}
