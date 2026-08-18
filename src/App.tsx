import { useEffect } from 'react';
import { Navigate, Route, BrowserRouter, Routes, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import Navbar from '@/components/Navbar';
import OceanBackground from '@/components/OceanBackground';
import ErrorBoundary from '@/components/ErrorBoundary';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Game from '@/pages/Game';
import LeaderboardPage from '@/pages/LeaderboardPage';
import { unlockAudio, playButtonClickSound } from '@/services/soundService';

function RequireCaptain({ children }: { children: React.ReactElement }) {
  // A player is only ever set by successfully logging in with an existing
  // captain name (see LoginForm) — if none is set, send them to /login.
  const player = usePlayerStore((s) => s.player);
  if (!player) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Fades + gently slides each route into place instead of snapping, so
 * navigating between pages feels continuous rather than instant/jarring.
 * `prefers-reduced-motion` is already respected globally in index.css.
 *
 * Important: this only animates the new page IN. It deliberately does not
 * use AnimatePresence's `mode="wait"` exit-then-enter pattern — that pattern
 * keeps the outgoing page mounted on screen until its exit animation fully
 * resolves, and if that animation ever stalls (e.g. a route change landing
 * at the same moment as another state update, like ending a voyage or
 * logging out), the old page is left stuck on screen even though the URL
 * has already changed underneath it — only a manual refresh would recover.
 * Keying a plain motion.div by the route (with no exit/AnimatePresence)
 * means React Router always swaps the page the instant the location
 * changes; the animation only ever affects how the new page appears, never
 * whether or when it appears.
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/home"
          element={
            <RequireCaptain>
              <Home />
            </RequireCaptain>
          }
        />
        <Route
          path="/game/:imageId"
          element={
            <RequireCaptain>
              <Game />
            </RequireCaptain>
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </motion.div>
  );
}

export default function App() {
  // Play the button-click sound for every <button> in the app, in one place,
  // instead of wiring it into each button individually. A capture-phase
  // listener on window fires the instant the click happens — same tick as
  // the button's own onClick — so there's no perceptible delay. Puzzle
  // tiles are skipped (via data-no-click-sound) because they already play
  // their own slide sound on click, triggered from the game store.
  //
  // A few CTAs (Landing's "Leaderboard", Navbar's "Set Sail" when it's a
  // <Link>) are React Router <Link> elements styled as buttons (btn-gold/
  // btn-outline) rather than real <button> elements, since they navigate
  // via an href instead of an onClick handler — so the selector matches
  // those too, not just <button>.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest('button, a.btn-gold, a.btn-outline');
      if (!el || el.hasAttribute('data-no-click-sound') || (el as HTMLButtonElement).disabled) return;
      playButtonClickSound();
    };
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, []);

  // Unlock audio playback on the very first tap/click/keypress anywhere in
  // the app. Without this, some mobile browsers (iOS Safari in particular)
  // silently drop the very first tile-slide sound because it's the first
  // audio playback attempt on the page. One-time listener, removed after it
  // fires once.
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="relative min-h-screen overflow-x-hidden">
        <OceanBackground />
        <Navbar />
        <main className="relative z-10">
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
