import { useState, type FormEvent } from 'react';

interface NameSetupFormProps {
  /** Called with the trimmed name on submit. Throw to show an error and re-enable the form. */
  onSubmit: (name: string) => Promise<void>;
}

/**
 * Shown exactly once per player: the first time they reach the game with
 * an authenticated session that has no `gamer_profile` row yet. Unlike the
 * old LoginForm, this never looks a name up — it only ever creates one,
 * and the name can't be changed again afterwards (enforced both here, by
 * never showing this form again once a profile exists, and at the database
 * level, since `gamer_profile` has no UPDATE policy).
 */
export default function NameSetupForm({ onSubmit }: NameSetupFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NameSetupForm] could not save captain name:', err);
      setError('Could not save your captain name. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="parchment-panel w-full max-w-md p-8 text-center sm:p-10">
      <h1 className="font-display text-3xl">Choose Your Captain Name</h1>
      <p className="mt-2 text-sm text-abyss/70">Welcome aboard! This is one-time only.</p>

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
          maxLength={40}
          className="mt-2 w-full rounded-md border border-abyss/20 bg-parchment px-4 py-3 text-abyss placeholder:text-abyss/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        />
        <p className="mt-2 text-xs text-abyss/60">
          Choose carefully — you won&apos;t be able to change this later.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-xs text-rust">
            {error}
          </p>
        )}
      </div>

      <button type="submit" disabled={!name.trim() || isSubmitting} className="btn-gold mt-8 w-full disabled:opacity-60">
        {isSubmitting ? 'Saving…' : 'Set Sail'}
      </button>
    </form>
  );
}
