interface MoveCounterProps {
  moves: number;
}

export default function MoveCounter({ moves }: MoveCounterProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs uppercase tracking-widest text-foam/60">Moves</span>
      <span className="font-mono text-2xl text-gold">{moves}</span>
    </div>
  );
}
