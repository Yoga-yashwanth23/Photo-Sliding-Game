import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { PuzzleImage } from '@/types';
import { GRID_SIZE } from '@/constants';

interface MapCarouselProps {
  images: PuzzleImage[];
}

/** How far (px) a drag/swipe must travel before it counts as a slide change. */
const SWIPE_THRESHOLD = 60;
/** How long the "launch" transition plays before navigating into the game. */
const LAUNCH_MS = 450;
/** Minimum time between wheel-triggered slide changes, so one trackpad swipe = one slide. */
const WHEEL_COOLDOWN_MS = 500;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0 }),
};

export default function MapCarousel({ images }: MapCarouselProps) {
  const navigate = useNavigate();
  const [[activeIndex, direction], setActive] = useState<[number, number]>([0, 0]);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const lastWheelAt = useRef(0);
  const swipeAreaRef = useRef<HTMLDivElement>(null);

  const activeImage = images[activeIndex];

  function goTo(nextIndex: number) {
    if (images.length === 0 || launchingId !== null) return;
    const wrapped = (nextIndex + images.length) % images.length;
    setActive([wrapped, wrapped > activeIndex ? 1 : -1]);
  }

  function handleDragEnd(_e: unknown, info: PanInfo) {
    if (info.offset.x <= -SWIPE_THRESHOLD) goTo(activeIndex + 1);
    else if (info.offset.x >= SWIPE_THRESHOLD) goTo(activeIndex - 1);
  }

  // Wheel/trackpad handling has to be a NATIVE (non-passive) listener,
  // not React's onWheel prop. React attaches onWheel as a passive
  // listener by default, so e.preventDefault() inside it is silently
  // ignored — meaning the browser's own "swipe to go back/forward"
  // history-navigation gesture would still fire underneath the
  // carousel's own slide animation. That's what caused a left-swipe to
  // both move the carousel AND navigate back to the previous page.
  useEffect(() => {
    const el = swipeAreaRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      // Trackpads report a sideways swipe as deltaX; ignore plain
      // vertical scrolling so the page can still scroll normally.
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      // Consume the gesture so the browser doesn't also treat it as
      // back/forward navigation.
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastWheelAt.current < WHEEL_COOLDOWN_MS) return;
      if (e.deltaX > 10) {
        lastWheelAt.current = now;
        goTo(activeIndex + 1);
      } else if (e.deltaX < -10) {
        lastWheelAt.current = now;
        goTo(activeIndex - 1);
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, launchingId, images.length]);

  function handlePlay() {
    if (!activeImage || launchingId !== null) return;
    // Play the puzzle's own image sliding out — a little preview of the
    // sliding-tile mechanic — before handing off to the game screen.
    setLaunchingId(activeImage.id);
    setTimeout(() => navigate(`/game/${activeImage.id}`), LAUNCH_MS);
  }

  if (images.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        ref={swipeAreaRef}
        className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-xl border border-gold/30 bg-abyss/60"
        style={{ overscrollBehaviorX: 'contain' }}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeImage.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.35, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex flex-col"
          >
            <motion.div
              className="relative flex-1 overflow-hidden"
              animate={launchingId === activeImage.id ? { x: '-100%', opacity: 0 } : { x: 0, opacity: 1 }}
              transition={{ duration: LAUNCH_MS / 1000, ease: 'easeIn' }}
            >
              <img
                src={activeImage.path}
                alt={`Puzzle preview: ${activeImage.name}`}
                className="h-full w-full select-none object-cover"
                draggable={false}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-abyss/90 to-transparent p-5 pt-10">
                <h3 className="text-xl text-gold">{activeImage.name}</h3>
                <p className="text-sm text-foam/80">
                  Grid <span className="font-mono">{GRID_SIZE} × {GRID_SIZE}</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous map"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-abyss/60 p-2 text-foam hover:bg-abyss/80"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Next map"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-abyss/60 p-2 text-foam hover:bg-abyss/80"
            >
              <FaChevronRight />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Go to ${image.name}`}
              onClick={() => goTo(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === activeIndex ? 'bg-gold' : 'bg-foam/30'
              }`}
            />
          ))}
        </div>
      )}

      <button onClick={handlePlay} disabled={launchingId !== null} className="btn-gold mt-6 w-full disabled:opacity-60">
        Play {activeImage.name}
      </button>
    </div>
  );
}
