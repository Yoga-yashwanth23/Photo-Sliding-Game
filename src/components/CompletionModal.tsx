import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '@/utils/timer';
import type { PerformanceResult } from '@/types';

interface CompletionModalProps {
  completionTimeMs: number;
  moves: number;
  performance: PerformanceResult;
  rank: number | null;
  isPersonalBest: boolean;
  submissionError?: string | null;
  isSubmitting?: boolean;
  onRetrySubmit?: () => void;
  onPlayAgain: () => void;
}

export default function CompletionModal({ completionTimeMs, moves, performance, rank, isPersonalBest, submissionError, isSubmitting, onRetrySubmit, onPlayAgain }: CompletionModalProps) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-abyss/80 px-4" role="dialog" aria-modal="true">
      <ConfettiField />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="parchment-panel relative z-10 w-full max-w-md p-8 text-center">
        <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring' }} className="mx-auto mb-3 text-3xl text-gold">{performance.pirateRank}</motion.div>
        <h2 className="mb-1 text-2xl">Treasure Uncovered!</h2>
        <p className="mb-3 text-sm text-abyss/70">{performance.feedback}</p>
        <div className="mb-5 rounded-lg bg-gold/15 px-4 py-3"><span className="text-xs uppercase tracking-widest text-abyss/60">Final Score · Grade {performance.letterGrade}</span><p className="font-mono text-4xl text-abyss">{performance.finalScore.toFixed(2)}<span className="text-lg"> / 100</span></p>{isPersonalBest && <p className="text-xs font-heading text-rust">New personal best!</p>}</div>
        <dl className="mb-5 grid grid-cols-2 gap-3 text-left"><Stat label="Time" value={formatTime(completionTimeMs)} /><Stat label="Moves" value={`${moves} / ${performance.expectedMinimumMoves}`} /><Stat label="Accuracy" value={`${performance.accuracyScore.toFixed(2)}%`} /><Stat label="Leaderboard" value={rank ? `#${rank}` : '—'} /></dl>
        <div className="mb-6 space-y-3 text-left"><PerformanceBar label="Move Efficiency" value={performance.moveEfficiency} delay={0.35} /><PerformanceBar label="Completion Time" value={performance.timeScore} delay={0.5} /><PerformanceBar label="Accuracy" value={performance.accuracyScore} delay={0.65} /></div>
        {submissionError && (
          <div role="alert" className="mb-4 rounded-md border border-rust/40 bg-rust/10 px-3 py-2 text-left text-xs text-rust">
            <p className="mb-1">{submissionError}</p>
            {onRetrySubmit && (
              <button type="button" onClick={onRetrySubmit} disabled={isSubmitting} className="font-heading underline underline-offset-2 disabled:opacity-60">
                {isSubmitting ? 'Retrying…' : 'Retry saving score'}
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-3"><button onClick={onPlayAgain} className="btn-gold">Play Again</button><button onClick={() => navigate('/leaderboard')} className="btn-outline !text-abyss !border-abyss/30 hover:!bg-abyss/5">Leaderboard</button><button onClick={() => navigate('/home')} className="btn-outline !text-abyss !border-abyss/30 hover:!bg-abyss/5">Home</button></div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-abyss/5 px-3 py-2"><dt className="text-xs uppercase tracking-widest text-abyss/50">{label}</dt><dd className="font-mono text-lg text-abyss">{value}</dd></div>; }
function PerformanceBar({ label, value, delay }: { label: string; value: number; delay: number }) { return <div><div className="mb-1 flex justify-between text-xs uppercase tracking-wider text-abyss/60"><span>{label}</span><span>{value.toFixed(2)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-abyss/10"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ delay, duration: 0.7, ease: 'easeOut' }} className="h-full rounded-full bg-rust" /></div></div>; }
function ConfettiField() { const pieces = Array.from({ length: 40 }); const colors = ['#C9A15A', '#B5502F', '#2F6B4F', '#EFE1C1', '#1D6E8C']; return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">{pieces.map((_, i) => <motion.span key={i} initial={{ y: -20, x: `${(i * 47) % 100}%`, opacity: 1, rotate: 0 }} animate={{ y: '110vh', rotate: 360 }} transition={{ duration: 2.5 + (i % 5) * 0.4, delay: (i % 10) * 0.08, ease: 'linear' }} className="absolute h-2 w-2" style={{ backgroundColor: colors[i % colors.length] }} />)}</div>; }
