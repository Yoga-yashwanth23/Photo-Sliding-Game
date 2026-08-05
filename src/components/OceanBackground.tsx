export default function OceanBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-abyss" aria-hidden="true">
      {/* The artwork itself, slowly panning/zooming for a living, fluid backdrop
          rather than a static image. Scaled up slightly so the pan never
          reveals an edge. */}
      <div className="absolute inset-0 bg-cove bg-cover bg-center animate-kenburns" />

      {/* Contrast scrim: darkens top/bottom so nav text and hero copy stay
          readable against the bright sunset sky and firelit beach. Colors
          are pulled from the artwork itself (deep teal water, near-black
          cliff shadow) so the overlay reads as depth, not a filter. */}
      <div className="absolute inset-0 bg-gradient-to-b from-abyss/80 via-abyss/25 to-abyss/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-abyss/50 via-transparent to-abyss/50" />

      {/* A thin warm glow along the horizon line, echoing the sunset. */}
      <div className="absolute inset-x-0 top-1/3 h-32 bg-gold/10 blur-3xl" />

      {/* Gentle drifting fog for atmosphere and motion without competing
          with the photo's own detail. */}
      <div className="absolute inset-x-0 top-10 h-40 bg-foam/5 blur-3xl animate-drift" />

      {/* Floating embers / sea-spray particles, matching the firelight in
          the scene. */}
      <div className="absolute inset-0">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-gold/40 animate-drift"
            style={{
              width: `${3 + (i % 3) * 2}px`,
              height: `${3 + (i % 3) * 2}px`,
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 90}%`,
              animationDuration: `${12 + (i % 5) * 3}s`,
              animationDelay: `${i * 0.4}s`,
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* Waterline shading to ground the UI at the bottom of the viewport. */}
      <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-abyss via-abyss/60 to-transparent" />
    </div>
  );
}
