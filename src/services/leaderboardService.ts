import type { LeaderboardEntry, LeaderboardFilters, Player, PlayerStatistics } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from '@/constants';
import { calculatePlayerStatistics } from '@/utils/scoringEngine';

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
 * Note: captain names are NOT required to be unique. `registerPlayer` always
 * creates a fresh player record so two people can sail under the same name
 * without colliding. `isNameTaken` is kept on the interface (unused by the
 * UI today) in case a future mode wants to reintroduce a uniqueness check.
 *
 * Sketch for the Supabase implementation (not wired up by default so the
 * app runs with zero configuration):
 *
 *   import { createClient } from '@supabase/supabase-js';
 *   const supabase = createClient(url, anonKey);
 *
 *   registerPlayer(name) -> supabase.from('players').insert({ player_name: name }).select().single();
 *
 *   submitResult(entry) -> supabase.from('leaderboard').insert({...});
 *
 *   subscribe(cb) -> supabase.channel('leaderboard-changes')
 *     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' },
 *         () => this.getEntries({}).then(cb))
 *     .subscribe();
 */
export interface ILeaderboardService {
  isNameTaken(name: string): Promise<boolean>;
  registerPlayer(name: string): Promise<Player>;
  submitResult(entry: Omit<LeaderboardEntry, 'id'>): Promise<LeaderboardEntry>;
  getEntries(filters?: Partial<LeaderboardFilters>): Promise<LeaderboardEntry[]>;
  getPlayerStatistics(playerId: string): Promise<PlayerStatistics | null>;
  subscribe(listener: LeaderboardListener): () => void;
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
    // Names are intentionally not deduplicated: every login creates its own
    // player record, so two different people can both play as "Jack".
    const player: Player = {
      id: crypto.randomUUID(),
      name: name.trim(),
      normalisedName: normalise(name),
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

export const leaderboardService: ILeaderboardService = new LocalLeaderboardService();
