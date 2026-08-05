import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAYER_NAME_RULES } from '@/constants';
import { leaderboardService } from '@/services/leaderboardService';
import { usePlayerStore } from '@/store/playerStore';
import CompassLoader from './CompassLoader';

function validateFormat(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < PLAYER_NAME_RULES.minLength) {
    return `A captain's name needs at least ${PLAYER_NAME_RULES.minLength} characters.`;
  }
  if (trimmed.length > PLAYER_NAME_RULES.maxLength) {
    return `Keep it to ${PLAYER_NAME_RULES.maxLength} characters or fewer.`;
  }
  if (!PLAYER_NAME_RULES.pattern.test(trimmed)) {
    return 'Only letters, numbers, and underscores are allowed — no spaces or symbols.';
  }
  return null;
}

export default function LoginForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const formatError = validateFormat(name);
    if (formatError) {
      setError(formatError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Any name is welcome aboard — no uniqueness check. Multiple pirates
      // can sail under the same name.
      const player = await leaderboardService.registerPlayer(name);
      setPlayer(player);
      navigate('/home');
    } catch {
      setError('The seas are rough — could not reach the crew registry. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="parchment-panel mx-auto w-full max-w-md p-8 transition-shadow duration-300 hover:shadow-xl" noValidate>
      <h2 className="mb-1 text-center text-2xl">Choose Your Captain Name</h2>
      <p className="mb-6 text-center text-sm text-abyss/70">
        No email, no password — just the name you sail under.
      </p>

      <label htmlFor="playerName" className="mb-1 block font-heading text-sm">
        Captain Name
      </label>
      <input
        id="playerName"
        name="playerName"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. CaptainJack"
        maxLength={PLAYER_NAME_RULES.maxLength}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? 'playerName-error' : undefined}
        className="mb-2 w-full rounded-md border border-abyss/20 bg-white/70 px-4 py-2.5 font-mono text-abyss outline-none transition-colors duration-200 focus-visible:border-ocean"
      />
      <p className="mb-4 text-xs text-abyss/50">
        3–20 characters. Letters, numbers, and underscores only.
      </p>

      {error && (
        <p id="playerName-error" role="alert" className="mb-4 rounded-md bg-rust/10 px-3 py-2 text-sm text-rust">
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full disabled:opacity-60">
        {isSubmitting ? <CompassLoader size={20} /> : 'Board the Ship'}
      </button>
    </form>
  );
}
