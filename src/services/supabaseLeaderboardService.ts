import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LeaderboardEntry, LeaderboardFilters, Player, PlayerStatistics } from '@/types';
import { calculatePlayerStatistics } from '@/utils/scoringEngine';
import { supabase } from './supabaseClient';
import type { ILeaderboardService, LeaderboardListener } from './leaderboardService';

/** Row shape of the `public.leaderboard` table — see supabase/schema.sql. */
interface LeaderboardRow {
  id: string;
  player_id: string;
  player_name: string;
  completion_time_ms: number;
  moves: number;
  final_score: number;
  expected_minimum_moves: number;
  move_efficiency: number;
  time_score: number;
  accuracy_score: number;
  pirate_rank: string;
  letter_grade: string;
  completed_at: number;
}

function fromRow(row: LeaderboardRow): LeaderboardEntry {
  return {
    id: row.id,
    playerId: row.player_id,
    playerName: row.player_name,
    completionTimeMs: row.completion_time_ms,
    moves: row.moves,
    finalScore: row.final_score,
    expectedMinimumMoves: row.expected_minimum_moves,
    moveEfficiency: row.move_efficiency,
    timeScore: row.time_score,
    accuracyScore: row.accuracy_score,
    pirateRank: row.pirate_rank,
    letterGrade: row.letter_grade,
    completedAt: row.completed_at,
  };
}

function toRow(entry: Omit<LeaderboardEntry, 'id'>, id?: string): Omit<LeaderboardRow, 'id'> & { id?: string } {
  return {
    ...(id ? { id } : {}),
    player_id: entry.playerId,
    player_name: entry.playerName,
    completion_time_ms: entry.completionTimeMs,
    moves: entry.moves,
    final_score: entry.finalScore,
    expected_minimum_moves: entry.expectedMinimumMoves,
    move_efficiency: entry.moveEfficiency,
    time_score: entry.timeScore,
    accuracy_score: entry.accuracyScore,
    pirate_rank: entry.pirateRank,
    letter_grade: entry.letterGrade,
    completed_at: entry.completedAt,
  };
}

function isWithinRange(timestamp: number, range: LeaderboardFilters['range']): boolean {
  if (range === 'all') return true;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === 'today') return now - timestamp < day;
  if (range === 'week') return now - timestamp < day * 7;
  return true;
}

/**
 * Supabase-backed leaderboard, swapped in by leaderboardService.ts whenever
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set. Talks to the
 * `public.leaderboard` table created by supabase/schema.sql, and uses
 * Supabase Realtime (Postgres changes) in place of the local
 * BroadcastChannel so every connected device sees new scores live.
 */
class SupabaseLeaderboardService implements ILeaderboardService {
  private channel: RealtimeChannel | null = null;
  private listeners = new Set<LeaderboardListener>();

  async isNameTaken(): Promise<boolean> {
    // Captain names are intentionally not unique (see leaderboardService.ts
    // interface docs) — nothing on the UI calls this today.
    return false;
  }

  async registerPlayer(name: string): Promise<Player> {
    // No auth/accounts in this app — a player is just a locally-generated
    // id paired with the chosen name, same as the local implementation.
    // It only needs to be stable for this browser session so submitResult
    // can upsert against player_id.
    return {
      id: crypto.randomUUID(),
      name: name.trim(),
      normalisedName: name.trim().toLowerCase(),
      createdAt: Date.now(),
    };
  }

  async submitResult(entry: Omit<LeaderboardEntry, 'id'>): Promise<LeaderboardEntry> {
    const { data: existing, error: fetchError } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('player_id', entry.playerId)
      .maybeSingle<LeaderboardRow>();

    if (fetchError) throw fetchError;

    // Mirrors LocalLeaderboardService: one row per player, only overwritten
    // when the new attempt scores higher.
    if (existing && entry.finalScore <= existing.final_score) {
      return fromRow(existing);
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .upsert(toRow(entry, existing?.id), { onConflict: 'player_id' })
      .select()
      .single<LeaderboardRow>();

    if (error) throw error;
    return fromRow(data);
  }

  async getEntries(filters?: Partial<LeaderboardFilters>): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase.from('leaderboard').select('*');
    if (error) throw error;

    const range = filters?.range ?? 'all';
    return (data ?? []).map(fromRow).filter((e) => isWithinRange(e.completedAt, range));
  }

  async getPlayerStatistics(playerId: string): Promise<PlayerStatistics | null> {
    const entries = await this.getEntries();
    return calculatePlayerStatistics(entries, playerId);
  }

  subscribe(listener: LeaderboardListener): () => void {
    this.listeners.add(listener);

    if (!this.channel) {
      this.channel = supabase
        .channel('leaderboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
          this.getEntries().then((entries) => this.listeners.forEach((l) => l(entries)));
        })
        .subscribe();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.channel) {
        supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }
}

export const supabaseLeaderboardService: ILeaderboardService = new SupabaseLeaderboardService();
