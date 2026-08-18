import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LeaderboardEntry, LeaderboardFilters, Player, PlayerStatistics } from '@/types';
import { calculatePlayerStatistics } from '@/utils/scoringEngine';
import { supabase } from './supabaseClient';
import { NameNotFoundError, type ILeaderboardService, type LeaderboardListener } from './leaderboardService';

/**
 * Postgres LIKE/ILIKE treats `%` and `_` as wildcards — and captain names
 * historically allowed underscores — so an unescaped ilike on a name like
 * "Captain_Jack" would also match "CaptainXJack". Escape both before using
 * the name in an ilike filter so the match is exact (case-insensitive) text
 * only.
 */
function escapeForIlike(value: string): string {
  return value.replace(/[%_]/g, (c) => `\\${c}`);
}

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
    // user id — see registerPlayer() below, which sets Player.id to
    // supabase.auth.getUser()'s id. That's also what's unique-constrained
    // on game2_scores (one row per user), so it doubles as the upsert key.
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
 * `public.game2_scores` table. Login (registerPlayer) is name-based: it
 * looks up an existing row by player_name and reuses its zephoria_user_id
 * as the player's identity — see the caveat in registerPlayer about RLS
 * and Supabase Auth sessions. Uses Supabase Realtime (Postgres changes) in
 * place of the local BroadcastChannel so every connected device sees new
 * scores live.
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
    // Login is now purely name-based: the typed captain name must already
    // exist as a `player_name` in game2_scores. If it does, log the player
    // back in as that existing row's identity (its zephoria_user_id) so
    // future submitResult calls keep upserting onto the same row. If it
    // doesn't exist, reject — this game does not create new rows from the
    // login form, only from data that's already on record.
    //
    // IMPORTANT: this does NOT establish a Supabase Auth session. If your
    // game2_scores RLS write policies are scoped to `auth.uid() =
    // zephoria_user_id` (see supabase/schema.sql), submitResult's
    // insert/update will be rejected by Postgres unless a real Supabase
    // Auth session already exists in the browser (e.g. a shared Zephoria
    // login token) whose auth.uid() happens to equal the row's
    // zephoria_user_id. If that's not the case here, loosen those policies
    // back to public read/write (matching the original leaderboard table)
    // or introduce a real sign-in step before this lookup runs.
    const trimmed = name.trim();
    const { data: existing, error } = await supabase
      .from('game2_scores')
      .select('zephoria_user_id, player_name')
      .ilike('player_name', escapeForIlike(trimmed))
      .maybeSingle<Pick<ScoreRow, 'zephoria_user_id' | 'player_name'>>();

    if (error) throw error;
    if (!existing) throw new NameNotFoundError(trimmed);

    return {
      id: existing.zephoria_user_id,
      name: existing.player_name,
      normalisedName: existing.player_name.trim().toLowerCase(),
      createdAt: Date.now(),
    };
  }

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
