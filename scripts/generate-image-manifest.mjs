// Regenerates public/images/images.json from whatever photos currently sit
// directly in public/images/. This is what lets the game "just work" when
// someone drops in a new batch of photos: run this (it's wired into
// `predev`/`prebuild`, see package.json) and every image in that folder
// becomes an entry the game can randomly pick from — no manual JSON editing
// required.
import { readdirSync, writeFileSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'public', 'images');
const MANIFEST_PATH = join(IMAGES_DIR, 'images.json');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Non-puzzle assets that live alongside the puzzle photos in public/images/
// and must never be treated as a pickable puzzle image. Add to this list if
// you add more site assets (logos, icons, etc.) to the same folder.
const EXCLUDED_FILES = new Set(['cove-sunset-bg.jpg']);

function toDisplayName(filename) {
  const stem = basename(filename, extname(filename));
  const cleaned = stem.replace(/[-_]+/g, ' ').trim();
  // Filenames like "900-1" or "IMG_0231" clean up into non-words like "900 1"
  // — fall back to a generic map name so cards never show a raw file id.
  const looksLikeAWord = /[a-zA-Z]{3,}/.test(cleaned);
  return looksLikeAWord
    ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
}

let files = [];
try {
  files = readdirSync(IMAGES_DIR)
    .filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))
    .filter((f) => !EXCLUDED_FILES.has(f))
    .sort((a, b) => a.localeCompare(b));
} catch {
  console.warn(`[generate-image-manifest] ${IMAGES_DIR} not found — writing an empty manifest.`);
}

const FALLBACK_NAMES = [
  'Uncharted Cove', 'Forgotten Atoll', 'Kraken\u2019s Reach', 'Widow\u2019s Cape',
  'Skull Harbor', 'Siren\u2019s Shoal', 'Gilded Lagoon', 'Storm Isle',
];

const manifest = files.map((file, index) => ({
  id: index + 1,
  name: toDisplayName(file) ?? FALLBACK_NAMES[index % FALLBACK_NAMES.length],
  path: `/images/${file}`,
}));

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[generate-image-manifest] Wrote ${manifest.length} image(s) to ${MANIFEST_PATH}`);
