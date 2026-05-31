// Types matching the JSON produced by the pipeline.

export type Member = { id: string; name: string };

export type Team = {
  team_id: number;
  name: string;
  abbrev: string;
  owner_ids: string[];
  owner_names: string[];
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  acquisitions: number;
  drops: number;
  trades: number;
  standing: number | null;
  final_standing: number | null;
  division_id: number | null;
  division_name: string | null;
};

export type DraftPick = {
  round: number | null;
  round_pick: number | null;
  overall_pick: number | null;
  team_id: number | null;
  player_id: number | null;
  player_name: string | null;
  keeper_status: boolean;
  bid_amount: number | null;
};

export type Matchup = {
  week: number;
  matchup_type: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  is_playoff: boolean;
};

export type BoxScoreRow = {
  side: 'home' | 'away';
  team_id: number | null;
  player_id: number | null;
  player_name: string | null;
  position: string | null;
  slot_position: string | null;
  pro_team: string | null;
  points: number;
  projected_points: number;
  injury_status: string | null;
};

export type Season = {
  year: number;
  settings: {
    name: string | null;
    team_count: number | null;
    playoff_team_count: number | null;
    reg_season_count: number | null;
    keeper_count: number | null;
    scoring_type: string | null;
    playoff_matchup_period_length: number | null;
  };
  members: Member[];
  teams: Team[];
  draft: DraftPick[];
  matchups: Matchup[];
  box_scores: Record<string, BoxScoreRow[]>;
};

export type OwnerAppearance = {
  year: number;
  team_id: number;
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  final_standing: number | null;
};

export type Owner = {
  owner_id: string;
  display_name: string;
  aliases: string[];
  /** Names of merged co-owners (other ESPN accounts whose ids fold into this one). */
  co_owner_names: string[];
  appearances: OwnerAppearance[];
};

export type Meta = {
  league_id: number;
  years: number[];
  current_year: number;
  next_year: number;
  /** Years whose ESPN data is excluded from records (e.g., league played on
   * Sleeper that year). Map of year string -> reason string. */
  excluded_record_years: Record<string, string>;
  updated_at: string;
};

export type SingleTeamGame = {
  year: number;
  week: number;
  matchup_type: string | null;
  is_playoff: boolean;
  team_id: number;
  team: string;
  owners: string[];
  owner_ids: string[];
  score: number;
  opp_team_id: number;
  opp_team: string;
  opp_owners: string[];
  opp_owner_ids: string[];
  opp_score: number;
  margin: number;
  combined: number;
};

export type MatchupGame = {
  year: number;
  week: number;
  matchup_type: string | null;
  is_playoff: boolean;
  home_team_id: number;
  home_team: string;
  home_owners: string[];
  home_owner_ids: string[];
  home_score: number;
  away_team_id: number;
  away_team: string;
  away_owners: string[];
  away_owner_ids: string[];
  away_score: number;
  winner_team_id: number | null;
  loser_team_id: number | null;
  margin: number;
  combined: number;
};

export type SeasonTeamRow = {
  year: number;
  team_id: number;
  team: string;
  owner_names: string[];
  owner_ids: string[];
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  games: number;
  ppg: number;
  final_standing: number | null;
};

export type OwnerAllTime = {
  owner_id: string;
  display_name: string;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  championships: number;
  runner_ups: number;
  third_place_finishes: number;
  playoff_appearances: number;
  best_finish: number | null;
  worst_finish: number | null;
  high_score: number;
  low_score: number | null;
  games_played: number;
  win_pct: number;
  points_diff: number;
  ppg: number;
};

export type H2HRow = {
  owner_a: string;
  owner_b: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
};

export type StreakRow = {
  owner_id: string;
  display_name: string;
  longest_win_streak: number;
  longest_loss_streak: number;
  win_streak_range: [[number, number], [number, number]] | null;
  loss_streak_range: [[number, number], [number, number]] | null;
};

export type Records = {
  /** Map of year string -> reason. Surfaces "this year was excluded because…" notes in UI. */
  excluded_years: Record<string, string>;
  highest_single_game: SingleTeamGame[];
  lowest_single_game: SingleTeamGame[];
  biggest_blowouts: MatchupGame[];
  closest_games: MatchupGame[];
  highest_combined: MatchupGame[];
  lowest_combined: MatchupGame[];
  highest_season_pf: SeasonTeamRow[];
  lowest_season_pf: SeasonTeamRow[];
  best_season_ppg: SeasonTeamRow[];
  worst_season_ppg: SeasonTeamRow[];
  best_records: SeasonTeamRow[];
  worst_records: SeasonTeamRow[];
  champions: SeasonTeamRow[];
  runners_up: SeasonTeamRow[];
  third_place: SeasonTeamRow[];
  sackos: SeasonTeamRow[];
  owner_alltime: OwnerAllTime[];
  head_to_head: H2HRow[];
  streaks: StreakRow[];
  weekly_high: SingleTeamGame[];
  weekly_low: SingleTeamGame[];
};

export type Keeper = {
  year: number;
  team_id: number;
  player_id: number;
  player_name: string | null;
  kept_round_this_year: number | null;
  kept_round_pick_this_year: number | null;
  previous_draft_round: number | null;
  previous_draft_team_id: number | null;
  espn_keeper_flag: boolean;
  on_previous_final_roster: boolean;
  origin: 'free_agent' | 'retained' | 'acquired_then_kept';
  consecutive_keeper_years: number;
};

export type KeeperCandidate = {
  team_id: number;
  player_id: number;
  player_name: string | null;
  position: string | null;
  pro_team: string | null;
  base_round_this_year: number | null;
  origin: 'drafted' | 'free_agent';
  drafted_by_team_id: number | null;
  consecutive_keeper_years_through_current: number;
  use_adp_next_year: boolean;
};

export type KeeperData = {
  keepers_by_year: Record<string, Keeper[]>;
  rules: {
    max_total: number;
    blocked_rounds: number[];
    max_rounds_4_to_7: number;
    max_rounds_8_to_16: number;
    free_agent_round: number;
  };
  next_year_planning: {
    for_year: number;
    based_on_season: number;
    candidates: KeeperCandidate[];
  };
};

export type AdpPlayer = {
  player_id: number;
  name: string;
  position: string | null;
  pro_team_id: number | null;
  adp: number;
  percent_owned: number | null;
  rank_standard: number | null;
  rank_ppr: number | null;
};

export type AdpData = {
  year: number;
  players: AdpPlayer[];
};

// ─── Player stats / MVPs ───────────────────────────────────────────────
export type PlayerPerformance = {
  year: number;
  week: number;
  player_id: number;
  player_name: string;
  position: string | null;
  slot_position: string | null;
  pro_team: string | null;
  points: number;
  started: boolean;
  team_id: number | null;
  team_name: string | null;
  owner_ids: string[];
  owner_names: string[];
  team_won: boolean | null;
  is_playoff: boolean;
};

export type WinningTeamLeader = {
  player_id: number;
  player_name: string;
  position: string | null;
  weeks_started: number;
  wins_when_started: number;
  win_rate_when_started: number;
  total_starting_points: number;
  ppg_started: number;
  seasons_count: number;
  last_year: number;
};

export type MvpRecord = {
  player_id: number;
  player_name: string;
  position: string | null;
  team_id: number | null;
  team_name: string | null;
  owner_ids: string[];
  owner_names: string[];
  starting_points: number;
  ppg_started?: number;
  games_started: number;
  team_wins?: number;
  team_games?: number;
  team_win_rate?: number;
  team_wins_when_started?: number;
  team_winning_share_sum?: number;
  mvp_score?: number;
  best_week_points?: number | null;
};

export type SeasonMvp = {
  regular_season: {
    mvp: MvpRecord | null;
    runners_up: MvpRecord[];
  };
  playoff: {
    mvp: MvpRecord | null;
    runners_up: MvpRecord[];
    champion_team_id: number | null;
    champion_team_name: string | null;
  };
};

export type PlayerData = {
  all_time_top_by_position: Record<string, PlayerPerformance[]>;
  season_top_by_position: Record<string, Record<string, PlayerPerformance[]>>;
  winning_team_appearances: WinningTeamLeader[];
  mvps_by_season: Record<string, SeasonMvp>;
  methodology: {
    regular_season_mvp: string;
    playoff_mvp: string;
    notes: string;
  };
  coverage: {
    first_year_with_box_scores: number | null;
    last_year_with_box_scores: number | null;
  };
};
