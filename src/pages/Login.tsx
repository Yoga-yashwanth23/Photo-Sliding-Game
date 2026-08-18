import { useEffect, useState } from 'react';
import LoginForm from '@/components/LoginForm';
import CompassLoader from '@/components/CompassLoader';
import { establishSessionFromUrl } from '@/services/sessionHandoff';

export default function Login() {
  // Gate the form behind this so we don't flash the captain-name form for a
  // split second before a handed-off session (if any) has been applied —
  // registerPlayer()'s RLS-scoped writes depend on that session already
  // being in place. There's no auto-redirect here: establishing a Supabase
  // Auth session is a separate concept from picking a captain name, so the
  // player still goes through LoginForm as normal either way.
  const [isEstablishingSession, setIsEstablishingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    establishSessionFromUrl().finally(() => {
      if (!cancelled) setIsEstablishingSession(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
      {isEstablishingSession ? <CompassLoader label="Coming Aboard…" /> : <LoginForm />}
    </div>
  );
}
