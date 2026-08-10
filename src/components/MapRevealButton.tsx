import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MapRevealButtonProps {
  imagePath: string;
  revealsUsed: number;
  maxReveals: number;
  /** Attempts to spend a reveal in the game store. Returns whether it was granted. */
  onReveal: () => boolean;
}

/** How long a revealed map stays visible before it automatically hides itself again. */
const AUTO_HIDE_MS = 4000;

/**
 * A single button that lets the player peek at the finished map while
 * solving the puzzle. Clicking it reveals the map immediately (no locked
 * placeholder — it's simply not shown until clicked), and it auto-hides
 * itself again after a few seconds.
 */
export default function MapRevealButton({ imagePath, revealsUsed, maxReveals, onReveal }: MapRevealButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const revealsLeft = Math.max(maxReveals - revealsUsed, 0);
  const canReveal = revealsLeft > 0;

  // Whenever the map becomes visible, start a timer that hides it again on
  // its own after AUTO_HIDE_MS. Clearing the timer on cleanup means the
  // panel remounting for a fresh attempt cancels any leftover timer.
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => setIsVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [isVisible]);

  function handleClick() {
    if (!canReveal) return;
    if (onReveal()) {
      setIsVisible(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!canReveal}
        className="btn-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {canReveal ? `🗺️ Reveal Map (${revealsLeft} left)` : 'No Reveals Left'}
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="map-reveal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsVisible(false)}
          >
            <motion.img
              src={imagePath}
              alt="Completed treasure map"
              className="max-h-[80vh] max-w-[90vw] rounded-lg border border-gold/40 object-contain shadow-2xl"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
