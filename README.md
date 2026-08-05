# Pirate Puzzle Quest 🏴‍☠️

A production-structured pirate-themed sliding puzzle game — React + TypeScript + Vite + Tailwind + Framer Motion + Zustand, with a pure-TypeScript puzzle engine (no third-party puzzle libraries) and a backend-agnostic leaderboard service.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build      # type-checks + production build to dist/
npm run preview    # preview the production build
```

No environment variables or backend setup are required to run it: the leaderboard and player registry run on `localStorage` out of the box (see "Going to a real backend" below).

## Architecture

```
src/
  components/   Presentational + interactive UI, no game rules
  pages/        Route-level screens (Landing, Login, Home, Game, Leaderboard, About)
  hooks/        usePuzzle, useTimer, useLeaderboard, usePoints — glue between store and UI
  store/        Zustand stores: player identity, live game state, leaderboard state
  utils/        Pure functions: shuffle, solvable, ranking, timer, points — fully unit-testable
  services/     storageService (localStorage), leaderboardService (interface + impl)
  types/        Shared TypeScript contracts
  constants/    Difficulty configs, scoring config, validation rules
public/images/  Puzzle photos + auto-generated images.json manifest — drop any number of photos straight in here, see below
```

Game rules (shuffle, solvability, scoring, ranking) live entirely in `src/utils` and `src/store/gameStore.ts`, independent of React — they can be unit tested or reused (e.g. server-side validation) without pulling in any UI code.

### Adding or replacing puzzle images

Drop any number of square-ish images (JPEG/PNG/WebP) straight into `public/images/` — no manifest editing, no code changes, no fixed limit on how many. `public/images/images.json` is no longer hand-maintained; it's regenerated automatically from whatever is in that folder by `scripts/generate-image-manifest.mjs`, which runs before every `npm run dev` and `npm run build` (via the `predev`/`prebuild` scripts). Run it manually any time with:

```bash
npm run generate:images
```

The script skips non-puzzle site assets it knows about (currently just `cove-sunset-bg.jpg`) — see `EXCLUDED_FILES` at the top of the script if you add more shared images to that same folder later.

Each visit to Home, the app fetches the full manifest and randomly picks 2 of the available photos to offer as maps (`src/pages/Home.tsx`, using `src/utils/pickRandom.ts`) — so with more than 2 photos in the folder, players see a different pair each time. Change `MAPS_PER_VISIT` in `Home.tsx` to offer more/fewer at once.

Recommended: square aspect ratio, 900–1500px per side, 2–5 MB max. Display names are derived from the filename (e.g. `kraken-cove.jpg` → "Kraken Cove"); files with no readable words in the name (e.g. `IMG_0231.jpg`) fall back to a themed placeholder name.

### Site background

`public/images/cove-sunset-bg.jpg` is the full-page background, applied in `src/components/OceanBackground.tsx` with a slow Ken Burns pan/zoom and a gradient scrim for text contrast. To swap it for another piece of art: drop the new file in `public/images/` and update the `cove` entry in `tailwind.config.js` (`theme.extend.backgroundImage.cove`). Keep it under ~500KB (JPEG, quality ~80) so first paint stays fast — a 1200–1600px-wide image is plenty since it's always shown blurred/dimmed under UI content.

### Captain names

Names are not required to be unique — `registerPlayer` always creates a new player record, so multiple people can play under the same name without conflict. Format rules (3–20 characters, letters/numbers/underscore) still apply.

### Scoring

`src/constants/index.ts` exports `SCORING_CONFIG` — base score per difficulty, time-bonus rate, "par" time/moves per difficulty, and move-penalty rate. Tune these values (or later expose them in an admin UI) without touching `utils/points.ts`.

### Going to a real backend (Supabase)

The app depends only on the `ILeaderboardService` interface (`src/services/leaderboardService.ts`). Today it's implemented by `LocalLeaderboardService` (localStorage + `BroadcastChannel` for same-device "live" updates). To go live with real accounts and a shared, realtime leaderboard:

1. `npm install @supabase/supabase-js`
2. Create the two tables described in the interface's doc comment (`players`, `leaderboard`). Captain names are **not** required to be unique in this build — every login creates a fresh player record — so skip any unique constraint on the name column unless you intentionally want to reintroduce that restriction.
3. Write a `SupabaseLeaderboardService` implementing `ILeaderboardService`, using `supabase.channel(...).on('postgres_changes', ...)` for the `subscribe()` method.
4. Swap the exported `leaderboardService` singleton to the new class. No component, hook, or store code changes.

This is also the seam where multiplayer races, tournaments, achievements, and an admin dashboard would hang off the same tables.

## Accessibility

- Full keyboard play: arrow keys slide the tile adjacent to the empty slot in that direction.
- Visible focus rings, ARIA labels on tiles and form fields, `aria-live` status on the leaderboard loading and login-check states.
- `prefers-reduced-motion` is respected globally (animations collapse to near-instant).

## Known limitations of this build

- The leaderboard is per-device (localStorage), not shared across users, until a real backend is wired in per the section above.
- Images ship as original placeholder SVG art; swap in real photography via `images.json` any time.
- No authentication beyond a unique display name, matching the spec (no email/password).
