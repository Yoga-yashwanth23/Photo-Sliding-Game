import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LeaderboardEntry, LeaderboardFilters, PlayerStatistics } from '@/types';
import { calculatePlayerStatistics } from '@/utils/scoringEngine';
import { supabase } from './supabaseClient';
import type { ILeaderboardService, LeaderboardListener } from './leaderboardService';

/** Row shape of the `public.game2_scores` table (see supabase table definition). */
interface ScoreRow {
  id: string;
  zephoria_user_id: string;
  player_id: string | null;
  player_name: string;
  completion_time_ms: number | null;
  moves: number | null;
  final_score: number | null;
  expected_minimum_moves: number | null;
  move_efficiency: number | null;
  time_score: number | null;
  accuracy_score: number | null;
  pirate_rank: string | null;
  letter_grade: string | null;
  completed_at: number | null;
}

function fromRow(row: ScoreRow): LeaderboardEntry {
  return {
    id: row.id,
    // The app's generic "playerId" concept is now the real Zephoria auth
    // user id — resolved by playerStore.ts via supabase.auth.getUser().
    // That's also what's unique-constrained on game2_scores (one row per
    // user), so it doubles as the upsert key.
    playerId: row.zephoria_user_id,
    playerName: row.player_name,
    completionTimeMs: row.completion_time_ms ?? 0,
    moves: row.moves ?? 0,
    finalScore: row.final_score ?? 0,
    expectedMinimumMoves: row.expected_minimum_moves ?? 0,
    moveEfficiency: row.move_efficiency ?? 0,
    timeScore: row.time_score ?? 0,
    accuracyScore: row.accuracy_score ?? 0,
    pirateRank: row.pirate_rank ?? '',
    letterGrade: row.letter_grade ?? '',
    completedAt: row.completed_at ?? 0,
  };
}

function toRow(entry: Omit<LeaderboardEntry, 'id'>, id?: string): Omit<ScoreRow, 'id'> & { id?: string } {
  return {
    ...(id ? { id } : {}),
    zephoria_user_id: entry.playerId,
    // player_id is nullable/legacy on this table now that zephoria_user_id
    // is the real identity column — left null rather than duplicating the
    // same uuid into two columns.
    player_id: null,
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
 * `public.game2_scores` table, keyed on `zephoria_user_id` — the real
 * Supabase Auth user id resolved up front by playerStore.ts +
 * gamerProfileService.ts, not anything this service looks up itself.
 * `entry.playerId` passed in below is always that auth.uid(). Uses Supabase
 * Realtime (Postgres changes) in place of the local BroadcastChannel so
 * every connected device sees new scores live.
 *
 * A `gamer_profile` insert already seeds a zero-score `game2_scores` row
 * for this user (see the create_game2_score_record_trigger on
 * gamer_profile), so submitResult below is really always an UPDATE onto an
 * existing row — the upsert just means it also works correctly if that row
 * is ever missing.
 */
class SupabaseLeaderboardService implements ILeaderboardService {
  private channel: RealtimeChannel | null = null;
  private listeners = new Set<LeaderboardListener>();

  async submitResult(entry: Omit<LeaderboardEntry, 'id'>): Promise<LeaderboardEntry> {
    const { data: existing, error: fetchError } = await supabase
      .from('game2_scores')
      .select('*')
      .eq('zephoria_user_id', entry.playerId)
      .maybeSingle<ScoreRow>();

    if (fetchError) throw fetchError;

    // Mirrors LocalLeaderboardService: one row per player, only overwritten
    // when the new attempt scores higher.
    if (existing && entry.finalScore <= (existing.final_score ?? 0)) {
      return fromRow(existing);
    }

    const { data, error } = await supabase
      .from('game2_scores')
      .upsert(toRow(entry, existing?.id), { onConflict: 'zephoria_user_id' })
      .select()
      .single<ScoreRow>();

    if (error) throw error;
    return fromRow(data);
  }

  async getEntries(filters?: Partial<LeaderboardFilters>): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase.from('game2_scores').select('*');
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
        .channel('game2-scores-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game2_scores' }, () => {
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
