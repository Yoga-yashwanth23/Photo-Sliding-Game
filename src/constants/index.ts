/** Every puzzle uses the same fixed grid size — no more easy/medium/hard tiers. */
export const GRID_SIZE = 4;

/** Medium-puzzle benchmark used consistently by the centralized scoring engine. */
export const EXPECTED_MINIMUM_MOVES = 42;

export const PLAYER_NAME_RULES = {
  minLength: 3,
  maxLength: 20,
  pattern: /^[A-Za-z0-9_]+$/,
};

export const STORAGE_KEYS = {
  currentPlayer: 'ppq:player',
  theme: 'ppq:theme',
  music: 'ppq:music',
  bestScores: 'ppq:bestScores',
  players: 'ppq:players',
  leaderboard: 'ppq:leaderboard',
  playerStatistics: 'ppq:playerStatistics',
  gameSession: 'ppq:gameSession',
};
