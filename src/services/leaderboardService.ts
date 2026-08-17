import type { LeaderboardEntry, LeaderboardFilters, Player, PlayerStatistics } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from '@/constants';
import { calculatePlayerStatistics } from '@/utils/scoringEngine';
import { isSupabaseConfigured } from './supabaseClient';
import { supabaseLeaderboardService } from './supabaseLeaderboardService';

export type LeaderboardListener = (entries: LeaderboardEntry[]) => void;

/**
 * Backend-agnostic contract for player identity + leaderboard persistence.
 *
 * The rest of the app (stores, hooks, components) depends only on this
 * interface. Today it's backed by `LocalLeaderboardService` (localStorage +
 * BroadcastChannel for same-device "realtime" updates). Swapping in a real
 * backend later — Supabase is the recommended target — means writing a
 * `SupabaseLeaderboardService` that implements the same methods and pointing
 * `leaderboardService` at it in one place. No component code changes.
 *
 * Captain name login: `registerPlayer(name)` now requires that name to
 * already exist on record — it looks the name up and logs the player back
 * in under their existing identity (so submitResult keeps updating the same
 * row) rather than creating a new one. If no match is found, it rejects
 * with `NameNotFoundError` so the login form can show "name not found"
 * rather than a generic error. `isNameTaken` is unused by the UI today.
 *
 * Supabase implementation: see supabaseLeaderboardService.ts. It talks to
 * `public.game2_scores`, looking players up by `player_name` and returning
 * their stored `zephoria_user_id` as the player's identity.
 * LocalLeaderboardService below is the no-backend dev fallback and, unlike
 * the Supabase version, still creates a new record for an unrecognised name
 * — there's no separate provisioning step in local/device-only mode, so
 * requiring pre-existing names there would make it impossible to ever log
 * in during local development.
 */
export interface ILeaderboardService {
  isNameTaken(name: string): Promise<boolean>;
  registerPlayer(name: string): Promise<Player>;
  submitResult(entry: Omit<LeaderboardEntry, 'id'>): Promise<LeaderboardEntry>;
  getEntries(filters?: Partial<LeaderboardFilters>): Promise<LeaderboardEntry[]>;
  getPlayerStatistics(playerId: string): Promise<PlayerStatistics | null>;
  subscribe(listener: LeaderboardListener): () => void;
}

/** Thrown by `registerPlayer` when the entered captain name has no existing record. */
export class NameNotFoundError extends Error {
  constructor(name: string) {
    super(`No captain named "${name}" was found.`);
    this.name = 'NameNotFoundError';
  }
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Guards against corrupted/legacy records in localStorage — e.g. entries
 * saved by a build from before the scoring-engine redesign, which won't
 * carry today's required numeric fields (finalScore, moveEfficiency, etc).
 * The UI calls .toFixed() on several of these directly; a record missing
 * one crashes that render with no error boundary catching it, which blanks
 * the entire app. Filtering malformed records out here — before they ever
 * reach a store or component — is cheaper and safer than guarding every
 * call site downstream.
 */
function isValidLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  const isFiniteNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  return (
    typeof e.id === 'string' &&
    typeof e.playerId === 'string' &&
    typeof e.playerName === 'string' &&
    isFiniteNumber(e.completionTimeMs) &&
    isFiniteNumber(e.moves) &&
    isFiniteNumber(e.finalScore) &&
    isFiniteNumber(e.expectedMinimumMoves) &&
    isFiniteNumber(e.moveEfficiency) &&
    isFiniteNumber(e.timeScore) &&
    isFiniteNumber(e.accuracyScore) &&
    typeof e.pirateRank === 'string' &&
    typeof e.letterGrade === 'string' &&
    isFiniteNumber(e.completedAt)
  );
}

function isWithinRange(timestamp: number, range: LeaderboardFilters['range']): boolean {
  if (range === 'all') return true;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === 'today') return now - timestamp < day;
  if (range === 'week') return now - timestamp < day * 7;
  return true;
}

class LocalLeaderboardService implements ILeaderboardService {
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ppq-leaderboard') : null;
  private listeners = new Set<LeaderboardListener>();

  constructor() {
    this.channel?.addEventListener('message', () => {
      this.getEntries().then((entries) => this.listeners.forEach((l) => l(entries)));
    });
  }

  private getPlayers(): Player[] {
    return storageService.get<Player[]>(STORAGE_KEYS.players) ?? [];
  }

  private getRawEntries(): LeaderboardEntry[] {
    const stored = storageService.get<unknown[]>(STORAGE_KEYS.leaderboard) ?? [];
    const valid = stored.filter(isValidLeaderboardEntry);
    // Drop any legacy/corrupt records so they don't linger and keep tripping
    // this on every load.
    if (valid.length !== stored.length) {
      storageService.set(STORAGE_KEYS.leaderboard, valid);
    }
    return valid;
  }

  async isNameTaken(name: string): Promise<boolean> {
    const target = normalise(name);
    return this.getPlayers().some((p) => p.normalisedName === target);
  }

  async registerPlayer(name: string): Promise<Player> {
    // Local/device-only dev fallback: unlike SupabaseLeaderboardService,
    // this still creates a fresh record for a name it hasn't seen before
    // rather than rejecting it — see the interface doc comment above for
    // why. Names are also not deduplicated: every unrecognised name here
    // creates its own player record.
    const target = normalise(name);
    const existingPlayer = this.getPlayers().find((p) => p.normalisedName === target);
    if (existingPlayer) return existingPlayer;

    const player: Player = {
      id: crypto.randomUUID(),
      name: name.trim(),
      normalisedName: target,
      createdAt: Date.now(),
    };
    const players = [...this.getPlayers(), player];
    storageService.set(STORAGE_KEYS.players, players);
    return player;
  }

  async submitResult(entry: Omit<LeaderboardEntry, 'id'>): Promise<LeaderboardEntry> {
    const rawEntries = this.getRawEntries();
    const existingIndex = rawEntries.findIndex((e) => e.playerId === entry.playerId);
    const existing = existingIndex !== -1 ? rawEntries[existingIndex] : null;

    // One row per player: only overwrite the existing row when the new
    // score beats it. If the new score is lower/equal, keep the old row
    // as-is and just return it (no new row is ever added for a repeat play).
    let record: LeaderboardEntry;
    let entries: LeaderboardEntry[];

    if (existing && entry.finalScore <= existing.finalScore) {
      record = existing;
      entries = rawEntries;
    } else {
      record = { ...entry, id: existing?.id ?? crypto.randomUUID() };
      entries =
        existingIndex !== -1
          ? rawEntries.map((e, i) => (i === existingIndex ? record : e))
          : [...rawEntries, record];
      storageService.set(STORAGE_KEYS.leaderboard, entries);
    }

    const allStatistics = storageService.get<Record<string, PlayerStatistics>>(STORAGE_KEYS.playerStatistics) ?? {};
    const stats = calculatePlayerStatistics(entries, record.playerId);
    if (stats) storageService.set(STORAGE_KEYS.playerStatistics, { ...allStatistics, [record.playerId]: stats });
    this.notify(entries);
    return record;
  }

  async getEntries(filters?: Partial<LeaderboardFilters>): Promise<LeaderboardEntry[]> {
    let entries = this.getRawEntries();
    const range = filters?.range ?? 'all';
    entries = entries.filter((e) => isWithinRange(e.completedAt, range));
    return entries;
  }

  async getPlayerStatistics(playerId: string): Promise<PlayerStatistics | null> {
    const cached = storageService.get<Record<string, PlayerStatistics>>(STORAGE_KEYS.playerStatistics)?.[playerId];
    if (cached) return cached;
    return calculatePlayerStatistics(this.getRawEntries(), playerId);
  }

  subscribe(listener: LeaderboardListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(entries: LeaderboardEntry[]) {
    this.listeners.forEach((l) => l(entries));
    // Tell other tabs/windows on this device to refresh too, approximating
    // realtime subscriptions until a networked backend is wired in.
    this.channel?.postMessage('update');
  }
}

// Swaps to Supabase automatically once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// are set (see .env.example and supabase/schema.sql). Falls back to the
// local/device-only implementation otherwise, so the app still runs with
// zero configuration.
export const leaderboardService: ILeaderboardService = isSupabaseConfigured
  ? supabaseLeaderboardService
  : new LocalLeaderboardService();
