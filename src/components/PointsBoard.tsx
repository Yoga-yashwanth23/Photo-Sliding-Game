interface PointsBoardProps {
  points: number;
}

export default function PointsBoard({ points }: PointsBoardProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs uppercase tracking-widest text-foam/60">Score</span>
      <span className="font-mono text-2xl text-gold">{points.toFixed(2)}</span>
    </div>
  );
}
