export default function About() {
  return <div className="mx-auto max-w-3xl px-6 py-16"><h1 className="mb-8 text-center text-3xl">How To Play</h1>
    <Section title="1. Set Sail">Choose a captain name - 3 to 20 characters, letters, numbers, and underscores only. No email or password is needed, and names do not have to be unique.</Section>
    <Section title="2. Choose Your Map">Every voyage uses the same Medium 4x4 grid. Choose a map and start sliding.</Section>
    <Section title="3. Restore the Map">The shuffle is guaranteed solvable and the timer begins with your first move. Click a tile beside the empty slot, or use the arrow keys, to restore the image.</Section>
    <Section title="4. Earn Your Rank">Each score is out of 100: Move Efficiency contributes 50%, Completion Time 30%, and Accuracy 20%. The leaderboard compares final score, efficiency, faster time, accuracy, then completion time.</Section>
  </div>;
}
function Section({ title, children }: { title: string; children: string }) { return <div className="plank-panel mb-6 p-6"><h2 className="mb-2 text-xl text-gold">{title}</h2><p className="text-foam/80">{children}</p></div>; }
