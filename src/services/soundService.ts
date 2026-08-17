/**
 * Sound effects for the puzzle: the tile-slide sound (the "sword sliding"
 * sound, plays on every valid move), the victory chime (plays once, the
 * instant the puzzle becomes solved), and the button-click sound (the
 * "bubble" sound, plays on every other button in the app — menus, modals,
 * nav, etc.).
 *
 * Design notes (why it's built this way):
 * - Victory uses a pool of pre-loaded <audio> elements, created up front,
 *   instead of creating an Audio object on first use. Creating/loading an
 *   element on first use is what causes a "delayed" sound the first time it
 *   plays — preloading eliminates that. A pool (not a single shared element)
 *   lets an effect be retriggered while still playing without cutting
 *   itself off.
 * - Tile-slide and button-click are played through the Web Audio API instead
 *   of a pooled <audio> element. HTMLAudioElement.volume caps at 1.0
 *   (already used for victory), so it can't go any louder than that. Web
 *   Audio's GainNode has no such ceiling — SLIDE_GAIN / CLICK_GAIN amplify
 *   each sound beyond its normal recorded level (or attenuate it below),
 *   with a limiter after it so a boost doesn't clip into harsh distortion.
 *   Each is decoded into a reusable AudioBuffer once up front, so every
 *   play() call is just scheduling that buffer to start immediately — no
 *   per-play loading delay, and overlapping plays naturally layer instead
 *   of cutting each other off.
 * - Each play*() function is called synchronously from the store or the
 *   click handler at the exact moment the underlying action happens, so the
 *   sound and the visual/state change start together with no delay.
 */

const POOL_SIZE = 6;
const VOLUME = 1.0;
// "Sword sliding" tile-move sound — boosted up from its previous level.
const SLIDE_GAIN = 0.2;
// "Bubble" button-click sound — turned down from its previous, louder level.
const CLICK_GAIN = 0.2;

interface SoundPool {
  play: () => void;
  primer: HTMLAudioElement;
}

function createSoundPool(src: string, size: number = POOL_SIZE): SoundPool {
  const pool: HTMLAudioElement[] = Array.from({ length: size }, () => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = VOLUME;
    // Kick off buffering immediately rather than waiting for first play.
    audio.load();
    return audio;
  });

  let nextIndex = 0;

  return {
    primer: pool[0],
    play: () => {
      const audio = pool[nextIndex];
      nextIndex = (nextIndex + 1) % pool.length;
      audio.currentTime = 0;
      // play() returns a promise that can reject (e.g. blocked autoplay);
      // swallow it so a blocked sound never breaks game logic.
      void audio.play().catch(() => {});
    },
  };
}

// Built as soon as this module is imported (app startup), so the element
// already has audio data buffered well before it's actually needed.
const victoryPool = createSoundPool('/sounds/victory-chime.mp3');

// --- Tile-slide & button-click: Web Audio API for real volume control past 1.0 ---

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

interface GainSound {
  play: () => void;
}

/**
 * Loads a sound into a reusable AudioBuffer and returns a play() function
 * that routes it through a GainNode (for volume above or below 1.0) and a
 * limiter (so a boosted gain doesn't clip into harsh distortion).
 */
function createGainSound(src: string, gainValue: number): GainSound {
  let buffer: AudioBuffer | null = null;
  let loading: Promise<AudioBuffer> | null = null;

  function load(): Promise<AudioBuffer> {
    if (buffer) return Promise.resolve(buffer);
    if (loading) return loading;

    loading = fetch(src)
      .then((res) => res.arrayBuffer())
      .then((data) => getAudioContext().decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded;
        return decoded;
      });

    return loading;
  }

  // Kick off fetch + decode as soon as this module loads, so the very
  // first play has zero decode delay.
  void load();

  function play(): void {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (!buffer) {
      // Buffer hasn't finished decoding yet (e.g. a play in the first
      // instant after page load) — play it as soon as it's ready instead
      // of dropping it.
      void load().then(play);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = gainValue;

    // Caps the signal so a boosted gain stays loud without harsh clipping.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;

    source.connect(gain).connect(limiter).connect(ctx.destination);
    source.start(0);
  }

  return { play };
}

// /sounds/tile-slide.mp3 is the user-supplied "sword sliding" clip.
const slideSound = createGainSound('/sounds/tile-slide.mp3', SLIDE_GAIN);
const clickSound = createGainSound('/sounds/button-click.mp3', CLICK_GAIN);

let unlocked = false;

/**
 * Mobile browsers (notably iOS Safari) block audio playback until it's
 * triggered directly inside a user-gesture event handler, and even then the
 * very first play can be silently swallowed unless the audio graph has been
 * "unlocked" by an earlier play attempt in a gesture. Call this once from
 * the first click/keydown handler in the app to remove that first-play gap
 * for every effect (slide, victory, and button-click alike).
 */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;

  const primer = victoryPool.primer;
  const previousVolume = primer.volume;
  primer.volume = 0;
  primer
    .play()
    .then(() => {
      primer.pause();
      primer.currentTime = 0;
      primer.volume = previousVolume;
    })
    .catch(() => {
      // Autoplay was blocked; the next real, user-gesture-triggered play()
      // call will still work normally.
      primer.volume = previousVolume;
    });

  // AudioContext starts "suspended" until resumed inside a user gesture.
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/** Plays the tile-slide ("sword sliding") sound immediately. */
export function playSlideSound(): void {
  slideSound.play();
}

/** Plays the victory chime immediately using the next free pooled element. */
export function playVictorySound(): void {
  victoryPool.play();
}

/** Plays the button-click ("bubble") sound immediately. */
export function playButtonClickSound(): void {
  clickSound.play();
}
