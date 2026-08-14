import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useStartVoyage } from '@/hooks/useStartVoyage';

export default function Navbar() {
  const player = usePlayerStore((s) => s.player);
  const logout = usePlayerStore((s) => s.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const { startVoyage, isStarting } = useStartVoyage();
  // Every link/button that can navigate away already closes the menu on
  // click (see navLink, handleLogout, and the Set Sail buttons below), so no
  // separate effect is needed to sync this with the current route.
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  // "Set Sail" no longer routes to a login page — there isn't one anymore.
  // It auto-registers a player (see useStartVoyage) the same way Landing's
  // "Get Started" button does, then drops straight into /home.
  function handleSetSail() {
    setMenuOpen(false);
    startVoyage();
  }

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`font-heading tracking-wide transition-colors duration-300 hover:text-gold-light ${
        location.pathname === to ? 'text-gold' : 'text-parchment/80'
      }`}
    >
      {label}
    </Link>
  );

  const showSetSail = !player;

  return (
    <header className="relative z-20 border-b border-gold/20 bg-abyss/60 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="font-display text-xl text-gold sm:text-2xl" onClick={() => setMenuOpen(false)}>
          Pirate Puzzle Quest
        </Link>

        <div className="hidden items-center gap-6 text-sm md:flex">
          {navLink('/home', 'Home')}
          {navLink('/leaderboard', 'Leaderboard')}
          {player ? (
            <div className="flex items-center gap-3 border-l border-gold/30 pl-6">
              <span className="font-mono text-xs text-foam">⚓ {player.name}</span>
              <button onClick={handleLogout} className="text-xs text-rust hover:underline">
                Log out
              </button>
            </div>
          ) : (
            showSetSail && (
              <button type="button" onClick={handleSetSail} disabled={isStarting} className="btn-gold text-xs disabled:opacity-60">
                Set Sail
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/30 text-gold md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 bg-gold transition-transform duration-300 ${
                menuOpen ? 'translate-y-[7px] rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] block h-0.5 w-5 bg-gold transition-opacity duration-200 ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] block h-0.5 w-5 bg-gold transition-transform duration-300 ${
                menuOpen ? '-translate-y-[7px] -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-gold/20 bg-abyss/95 md:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-5 text-base">
              {navLink('/home', 'Home')}
              {navLink('/leaderboard', 'Leaderboard')}
              {player ? (
                <div className="flex items-center justify-between border-t border-gold/20 pt-4">
                  <span className="font-mono text-xs text-foam">⚓ {player.name}</span>
                  <button onClick={handleLogout} className="text-xs text-rust hover:underline">
                    Log out
                  </button>
                </div>
              ) : (
                showSetSail && (
                  <button type="button" onClick={handleSetSail} disabled={isStarting} className="btn-gold w-full text-xs disabled:opacity-60">
                    Set Sail
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
