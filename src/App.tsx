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
import About from '@/pages/About';

function RequireCaptain({ children }: { children: React.ReactElement }) {
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
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </motion.div>
  );
}

export default function App() {
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
