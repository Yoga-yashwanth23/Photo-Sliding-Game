import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardService, NameNotFoundError } from '@/services/leaderboardService';
import { usePlayerStore } from '@/store/playerStore';

export default function LoginForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const player = await leaderboardService.registerPlayer(trimmed);
      setPlayer(player);
      navigate('/home');
    } catch (err) {
      if (err instanceof NameNotFoundError) {
        setError('That captain name isn\u2019t on record. Double-check the spelling, or ask to be added first.');
      } else {
        // eslint-disable-next-line no-console
        console.error('[LoginForm] could not log in:', err);
        setError('Could not reach the crew registry. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="parchment-panel w-full max-w-md p-8 text-center sm:p-10">
      <h1 className="font-display text-3xl">Choose Your Captain Name</h1>
      <p className="mt-2 text-sm text-abyss/70">No email, no password — just the name you sail under.</p>

      <div className="mt-8 text-left">
        <label htmlFor="captain-name" className="font-heading text-xs uppercase tracking-wide text-abyss/70">
          Captain Name
        </label>
        <input
          id="captain-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. CaptainJack"
          autoComplete="off"
          autoFocus
          className="mt-2 w-full rounded-md border border-abyss/20 bg-parchment px-4 py-3 text-abyss placeholder:text-abyss/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        />
        <p className="mt-2 text-xs text-abyss/60">Must match a captain name already on record.</p>
        {error && (
          <p role="alert" className="mt-2 text-xs text-rust">
            {error}
          </p>
        )}
      </div>

      <button type="submit" disabled={!name.trim() || isSubmitting} className="btn-gold mt-8 w-full disabled:opacity-60">
        {isSubmitting ? 'Boarding…' : 'Board the Ship'}
      </button>
    </form>
  );
}
