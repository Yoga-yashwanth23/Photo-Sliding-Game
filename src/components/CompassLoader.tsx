interface CompassLoaderProps {
  label?: string;
  size?: number;
}

/**
 * The app's signature element: a hand-drawn-style compass rose whose needle
 * gently searches for true north. Reused as the loading indicator, on the
 * landing hero, and as the mark stamped on completion.
 */
export default function CompassLoader({ label, size = 72 }: CompassLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" stroke="#C9A15A" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="38" stroke="#C9A15A" strokeWidth="0.75" opacity="0.6" />
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          const isCardinal = i % 4 === 0;
          const outer = isCardinal ? 46 : 42;
          const inner = isCardinal ? 38 : 40;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={50 + inner * Math.sin(rad)}
              y1={50 - inner * Math.cos(rad)}
              x2={50 + outer * Math.sin(rad)}
              y2={50 - outer * Math.cos(rad)}
              stroke="#C9A15A"
              strokeWidth={isCardinal ? 1.5 : 0.75}
            />
          );
        })}
        <g className="origin-center animate-needle" style={{ transformOrigin: '50px 50px' }}>
          <polygon points="50,14 56,50 50,50" fill="#B5502F" />
          <polygon points="50,86 44,50 50,50" fill="#EFE1C1" />
        </g>
        <circle cx="50" cy="50" r="3" fill="#C9A15A" />
      </svg>
      {label && <p className="font-heading text-sm text-gold tracking-widest uppercase">{label}</p>}
    </div>
  );
}
