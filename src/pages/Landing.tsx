import { Link } from 'react-router-dom';
import CompassLoader from '@/components/CompassLoader';

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
      <CompassLoader size={96} />
      <h1 className="mt-6 font-display text-gold" style={{ fontSize: 'clamp(2.5rem, 5vw + 1rem, 4.5rem)' }}>
        Pirate Puzzle Quest
      </h1>
      <p className="mt-4 max-w-xl text-lg text-foam/80">
        Restore the Lost Treasure Map and Become the Greatest Pirate.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link to="/login" className="btn-gold">
          Play Now
        </Link>
        <Link to="/leaderboard" className="btn-outline">
          Leaderboard
        </Link>
        <Link to="/about" className="btn-outline">
          How To Play
        </Link>
      </div>
    </div>
  );
}
