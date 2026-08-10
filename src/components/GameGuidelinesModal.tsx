import { AnimatePresence, motion } from 'framer-motion';

interface GameGuidelinesModalProps {
  open: boolean;
  onClose: () => void;
}

const RANKS: Array<[string, string]> = [
  ['95 – 100', '👑 Pirate King'],
  ['90 – 94', '🏴 Emperor'],
  ['80 – 89', '⚓ Fleet Admiral'],
  ['70 – 79', '🦜 Captain'],
  ['60 – 69', '⚔ Commander'],
  ['50 – 59', '🧭 Navigator'],
  ['40 – 49', '🏝 Sailor'],
  ['Below 40', '🪝 Cabin Boy'],
];

const GRADES: Array<[string, string]> = [
  ['98 – 100', '🌟 S+ (Legendary)'],
  ['94 – 97', '⭐ S (Excellent)'],
  ['90 – 93', '🥇 A+ (Outstanding)'],
  ['85 – 89', '🥈 A (Very Good)'],
  ['80 – 84', '🥉 B+ (Good)'],
  ['70 – 79', '✔ B (Above Average)'],
  ['60 – 69', '📘 C (Average)'],
  ['50 – 59', '📙 D (Needs Improvement)'],
  ['Below 50', '❌ F (Keep Practicing)'],
];

/**
 * Pre-game guidelines popup. Shown to the player before they can interact
 * with the puzzle board. Clicking "Close" (or the backdrop / X) dismisses
 * it and reveals the board underneath.
 */
export default function GameGuidelinesModal({ open, onClose }: GameGuidelinesModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guidelines-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="parchment-panel relative flex w-full max-w-2xl flex-col overflow-hidden text-abyss"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-abyss/10 px-6 py-5 sm:px-8">
              <div>
                <h2 id="guidelines-modal-title" className="text-2xl">
                  🏴‍☠️ Pirate Puzzle Quest
                </h2>
                <p className="mt-1 text-sm text-abyss/60">Game Guidelines — read up before you set sail, Captain.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close guidelines"
                className="shrink-0 rounded-full border border-abyss/20 px-3 py-1 text-lg leading-none text-abyss/60 transition hover:bg-abyss/10 hover:text-abyss"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 sm:px-8">
              <Section title="🎯 Objective">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Rearrange all puzzle pieces into their correct positions.</li>
                  <li>Complete the puzzle using the fewest possible moves.</li>
                  <li>Finish as quickly as possible.</li>
                  <li>Avoid unnecessary or repetitive movements.</li>
                  <li>Achieve the highest Final Score and climb the leaderboard.</li>
                </ul>
                <p className="mt-2 italic text-abyss/60">The smartest pirate — not necessarily the fastest — earns the greatest rewards.</p>
              </Section>

              <Section title="🎮 How to Play">
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Click or tap a tile directly adjacent to the empty space.</li>
                  <li>The selected tile slides into the empty position.</li>
                  <li>Continue sliding tiles until the complete image is restored.</li>
                  <li>The puzzle is complete only when every tile is placed correctly.</li>
                </ol>
              </Section>

              <Section title="⏱ Timer & 🔄 Move Counter">
                <p>The timer starts automatically on your first move and stops the instant the puzzle is solved. Every tile movement increases your move count — plan ahead, and avoid unnecessary back-and-forth.</p>
              </Section>

              <Section title="🗺️ Reveal Map">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Tap the "Reveal Map" button above the board to peek at the completed image.</li>
                  <li>Each peek shows the full picture for 4 seconds, then it hides itself again automatically.</li>
                  <li>You get a limited number of reveals per voyage — use them wisely.</li>
                  <li>Once you've used them all, the button disables until you start a new attempt.</li>
                </ul>
              </Section>

              <Section title="⭐ How Your Score Is Calculated">
                <p className="mb-2">Your Final Score is out of 100, made up of three metrics:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>Move Efficiency — 50%:</strong> compares your total moves to the expected minimum.</li>
                  <li><strong>Completion Time — 30%:</strong> faster solves score higher, but don't sacrifice efficiency for speed.</li>
                  <li><strong>Accuracy — 20%:</strong> rewards meaningful moves and fewer reversals or repeats.</li>
                </ul>
              </Section>

              <Section title="🏴 Pirate Rank">
                <RankTable rows={RANKS} headers={['Final Score', 'Pirate Rank']} />
              </Section>

              <Section title="🏅 Performance Grade">
                <RankTable rows={GRADES} headers={['Final Score', 'Grade']} />
              </Section>

              <Section title="🏆 Leaderboard Tie-Breakers">
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Highest Final Score</li>
                  <li>Best Move Efficiency</li>
                  <li>Fastest Completion Time</li>
                  <li>Highest Accuracy</li>
                  <li>Earliest Completion Time</li>
                </ol>
              </Section>

              <Section title="💡 Tips to Become the Pirate King" last>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Plan your moves before making them.</li>
                  <li>Focus on efficiency rather than random movement.</li>
                  <li>Balance speed with accuracy.</li>
                  <li>Avoid unnecessary backtracking and repeated tile movements.</li>
                  <li>Study your performance summary after each game.</li>
                </ul>
              </Section>
            </div>

            {/* Footer */}
            <div className="border-t border-abyss/10 px-6 py-4 sm:px-8">
              <button type="button" onClick={onClose} className="btn-gold w-full sm:w-auto">
                Close &amp; Set Sail ⚓
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-5 border-b border-abyss/10 pb-5'}>
      <h3 className="mb-2 text-base font-heading tracking-wide text-abyss">{title}</h3>
      <div className="text-sm leading-relaxed text-abyss/80">{children}</div>
    </div>
  );
}

function RankTable({ rows, headers }: { rows: Array<[string, string]>; headers: [string, string] }) {
  return (
    <div className="overflow-hidden rounded-md border border-abyss/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-abyss/5">
            <th className="px-3 py-2 font-heading font-normal tracking-wide text-abyss/70">{headers[0]}</th>
            <th className="px-3 py-2 font-heading font-normal tracking-wide text-abyss/70">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([score, label]) => (
            <tr key={score} className="border-t border-abyss/10">
              <td className="px-3 py-1.5 font-mono text-abyss/80">{score}</td>
              <td className="px-3 py-1.5 text-abyss/80">{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
