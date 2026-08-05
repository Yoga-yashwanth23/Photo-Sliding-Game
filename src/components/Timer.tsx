import { formatTimePrecise } from '@/utils/timer';

interface TimerProps {
  elapsedMs: number;
}

export default function Timer({ elapsedMs }: TimerProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs uppercase tracking-widest text-foam/60">Time</span>
      <span className="font-mono text-2xl text-gold" aria-live="off">
        {formatTimePrecise(elapsedMs)}
      </span>
    </div>
  );
}
