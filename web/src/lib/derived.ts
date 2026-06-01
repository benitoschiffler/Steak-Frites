// Derived stats computed from season files for the Playoffs and What-If pages.
// Server-only — runs at build time, walks every season's matchups.
import "server-only";
import { loadAllSeasons, loadMeta } from "./data";
import type { Matchup, Season, Team } from "./types";

const PYTHAG_EXPONENT = 2.37;

export type OwnerRef = {
  owner_id: string;
  display_name: string;
};

export type PlayoffOwnerRow = {
  owner_id: string;
  display_name: string;
  playoff_appearances: number;
  playoff_wins: number;
  playoff_losses: number;
  playoff_pf: number;
  playoff_pa: number;
  playoff_games: number;
  playoff_ppg: number;
  playoff_win_pct: number;
  championships: number;
  runner_ups: number;
  third_place_finishes: number;
  finals_appearances: number;
  best_finish: number | null;
};

export type FinalsRow = {
  year: number;
  champion_team: string;
  champion_owners: string[];
  champion_score: number | null;
  runner_up_team: string;
  runner_up_owners: string[];
  runner_up_score: number | null;
  third_place_team: string | null;
  third_place_owners: string[];
  playoff_mvp_name: string | null;
  playoff_mvp_position: string | null;
  playoff_mvp_points: number | null;
};

export type WhatIfTeamRow = {
  year: number;
  team_id: number;
  team: string;
  owner_names: string[];
  owner_ids: string[];
  wins: number;
  losses: number;
  ties: number;
  games: number;
  points_for: number;
  points_against: number;
  // All-play: vs everyone each week
  all_play_wins: number;
  all_play_losses: number;
  all_play_ties: number;
  all_play_games: number;
  all_play_win_pct: number;
  // Pythagorean expected wins
  pyth_win_pct: number;
  pyth_expected_wins: number;
  // Luck: actual wins - expected wins (positive = luckier than PF/PA suggests)
  luck_vs_pyth: number;
  luck_vs_all_play: number;
};

export type WhatIfOwnerRow = {
  owner_id: string;
  display_name: string;
  seasons: number;
  actual_wins: number;
  actual_losses: number;
  actual_ties: number;
  expected_wins: number;
  all_play_wins: number;
  all_play_losses: number;
  all_play_ties: number;
  all_play_games: number;
  luck_vs_pyth: number;
  luck_vs_all_play: number;
  pyth_win_pct: number;
  all_play_win_pct: number;
  actual_win_pct: number;
};

function isCompleted(m: Matchup): boolean {
  return (
    m.home_team_id != null &&
    m.away_team_id != null &&
    m.home_score != null &&
    m.away_score != null &&
    !(m.home_score === 0 && m.away_score === 0)
  );
}

function isWinnersBracket(m: Matchup): boolean {
  return m.is_playoff === true && m.matchup_type === "WINNERS_BRACKET";
}

function teamByIdMap(teams: Team[]): Map<number, Team> {
  return new Map(teams.map((t) => [t.team_id, t]));
}

// ────────────────────────────────────────────────────────────────────────────
// Playoff stats
// ────────────────────────────────────────────────────────────────────────────

export function computePlayoffOwnerRows(): PlayoffOwnerRow[] {
  const seasons = loadAllSeasons();
  // Aggregator keyed by owner_id (an owner may co-own a team — we credit each)
  type Acc = {
    owner_id: string;
    display_name: string;
    years: Set<number>;
    wins: number;
    losses: number;
    pf: number;
    pa: number;
    games: number;
    championships: number;
    runner_ups: number;
    thirds: number;
    bestFinish: number | null;
  };
  const acc = new Map<string, Acc>();

  function get(ownerId: string, displayName: string): Acc {
    let a = acc.get(ownerId);
    if (!a) {
      a = {
        owner_id: ownerId,
        display_name: displayName,
        years: new Set(),
        wins: 0,
        losses: 0,
        pf: 0,
        pa: 0,
        games: 0,
        championships: 0,
        runner_ups: 0,
        thirds: 0,
        bestFinish: null,
      };
      acc.set(ownerId, a);
    }
    return a;
  }

  for (const season of seasons) {
    const byId = teamByIdMap(season.teams);

    for (const team of season.teams) {
      // Track best finish per owner across all years
      if (team.final_standing != null) {
        for (let i = 0; i < team.owner_ids.length; i++) {
          const oid = team.owner_ids[i];
          const name = team.owner_names[i] ?? oid;
          const a = get(oid, name);
          if (team.final_standing === 1) a.championships += 1;
          if (team.final_standing === 2) a.runner_ups += 1;
          if (team.final_standing === 3) a.thirds += 1;
          if (a.bestFinish == null || team.final_standing < a.bestFinish) {
            a.bestFinish = team.final_standing;
          }
        }
      }
    }

    // Walk winners-bracket games only — championship path, not consolation
    for (const m of season.matchups) {
      if (!isWinnersBracket(m) || !isCompleted(m)) continue;
      const home = byId.get(m.home_team_id as number);
      const away = byId.get(m.away_team_id as number);
      if (!home || !away) continue;
      const hs = m.home_score as number;
      const as = m.away_score as number;
      // credit each owner of the team
      for (let i = 0; i < home.owner_ids.length; i++) {
        const a = get(home.owner_ids[i], home.owner_names[i] ?? home.owner_ids[i]);
        a.years.add(season.year);
        a.games += 1;
        a.pf += hs;
        a.pa += as;
        if (hs > as) a.wins += 1;
        else if (hs < as) a.losses += 1;
      }
      for (let i = 0; i < away.owner_ids.length; i++) {
        const a = get(away.owner_ids[i], away.owner_names[i] ?? away.owner_ids[i]);
        a.years.add(season.year);
        a.games += 1;
        a.pf += as;
        a.pa += hs;
        if (as > hs) a.wins += 1;
        else if (as < hs) a.losses += 1;
      }
    }
  }

  return [...acc.values()].map((a) => {
    const finals = a.championships + a.runner_ups;
    const winPct = a.games ? a.wins / a.games : 0;
    return {
      owner_id: a.owner_id,
      display_name: a.display_name,
      playoff_appearances: a.years.size,
      playoff_wins: a.wins,
      playoff_losses: a.losses,
      playoff_pf: round2(a.pf),
      playoff_pa: round2(a.pa),
      playoff_games: a.games,
      playoff_ppg: a.games ? round2(a.pf / a.games) : 0,
      playoff_win_pct: round4(winPct),
      championships: a.championships,
      runner_ups: a.runner_ups,
      third_place_finishes: a.thirds,
      finals_appearances: finals,
      best_finish: a.bestFinish,
    } satisfies PlayoffOwnerRow;
  });
}

// Finals history: per season find the championship game + 3rd-place game + MVP.
export function computeFinalsHistory(): FinalsRow[] {
  const seasons = loadAllSeasons();
  const meta = loadMeta();

  // Pull MVPs lazily to avoid coupling — fetched by caller via players.json
  const rows: FinalsRow[] = [];
  for (const season of seasons) {
    if (meta.excluded_record_years[String(season.year)]) continue;
    const byId = teamByIdMap(season.teams);
    const champion = season.teams.find((t) => t.final_standing === 1);
    const runnerUp = season.teams.find((t) => t.final_standing === 2);
    const thirdPlace = season.teams.find((t) => t.final_standing === 3);
    if (!champion || !runnerUp) continue;

    // Find the finals game: latest-week WINNERS_BRACKET matchup containing both
    const candidates = season.matchups
      .filter((m) => isWinnersBracket(m) && isCompleted(m))
      .filter((m) => {
        const ids = [m.home_team_id, m.away_team_id];
        return ids.includes(champion.team_id) && ids.includes(runnerUp.team_id);
      })
      .sort((a, b) => b.week - a.week);
    const finals = candidates[0];
    let champScore: number | null = null;
    let runnerScore: number | null = null;
    if (finals) {
      const hs = finals.home_score as number;
      const as = finals.away_score as number;
      if (finals.home_team_id === champion.team_id) {
        champScore = hs;
        runnerScore = as;
      } else {
        champScore = as;
        runnerScore = hs;
      }
    }

    rows.push({
      year: season.year,
      champion_team: champion.name,
      champion_owners: champion.owner_names,
      champion_score: champScore,
      runner_up_team: runnerUp.name,
      runner_up_owners: runnerUp.owner_names,
      runner_up_score: runnerScore,
      third_place_team: thirdPlace?.name ?? null,
      third_place_owners: thirdPlace?.owner_names ?? [],
      // MVP filled in by page (it has loadPlayers)
      playoff_mvp_name: null,
      playoff_mvp_position: null,
      playoff_mvp_points: null,
    });
    // silence "unused" — byId is reserved for future expansion
    void byId;
  }
  return rows.sort((a, b) => b.year - a.year);
}

// ────────────────────────────────────────────────────────────────────────────
// What-if / luck stats
// ────────────────────────────────────────────────────────────────────────────

export function computeWhatIfTeamRows(): WhatIfTeamRow[] {
  const seasons = loadAllSeasons();
  const meta = loadMeta();
  const rows: WhatIfTeamRow[] = [];

  for (const season of seasons) {
    if (meta.excluded_record_years[String(season.year)]) continue;
    rows.push(...whatIfForSeason(season));
  }
  return rows;
}

function whatIfForSeason(season: Season): WhatIfTeamRow[] {
  const byId = teamByIdMap(season.teams);
  // Build per-week per-team regular-season scores
  // (We're using regular season only for luck — playoffs are not schedule-driven.)
  type WeekScore = { team_id: number; score: number };
  const weeks = new Map<number, WeekScore[]>();
  for (const m of season.matchups) {
    if (m.is_playoff) continue;
    if (!isCompleted(m)) continue;
    if (!weeks.has(m.week)) weeks.set(m.week, []);
    const list = weeks.get(m.week)!;
    list.push({ team_id: m.home_team_id as number, score: m.home_score as number });
    list.push({ team_id: m.away_team_id as number, score: m.away_score as number });
  }

  // Per-team aggregates
  type Acc = {
    team_id: number;
    wins: number;
    losses: number;
    ties: number;
    pf: number;
    pa: number;
    games: number;
    ap_wins: number;
    ap_losses: number;
    ap_ties: number;
    ap_games: number;
  };
  const teamAcc = new Map<number, Acc>();
  function get(team_id: number): Acc {
    let a = teamAcc.get(team_id);
    if (!a) {
      a = {
        team_id,
        wins: 0,
        losses: 0,
        ties: 0,
        pf: 0,
        pa: 0,
        games: 0,
        ap_wins: 0,
        ap_losses: 0,
        ap_ties: 0,
        ap_games: 0,
      };
      teamAcc.set(team_id, a);
    }
    return a;
  }

  // H2H actual record + PF/PA from regular season
  for (const m of season.matchups) {
    if (m.is_playoff) continue;
    if (!isCompleted(m)) continue;
    const hs = m.home_score as number;
    const as = m.away_score as number;
    const h = get(m.home_team_id as number);
    const a = get(m.away_team_id as number);
    h.games += 1;
    a.games += 1;
    h.pf += hs;
    h.pa += as;
    a.pf += as;
    a.pa += hs;
    if (hs > as) {
      h.wins += 1;
      a.losses += 1;
    } else if (hs < as) {
      a.wins += 1;
      h.losses += 1;
    } else {
      h.ties += 1;
      a.ties += 1;
    }
  }

  // All-play: each week, each team is compared to every other team that played that week
  for (const [, list] of weeks) {
    for (let i = 0; i < list.length; i++) {
      const me = list[i];
      const a = get(me.team_id);
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const them = list[j];
        a.ap_games += 1;
        if (me.score > them.score) a.ap_wins += 1;
        else if (me.score < them.score) a.ap_losses += 1;
        else a.ap_ties += 1;
      }
    }
  }

  const rows: WhatIfTeamRow[] = [];
  for (const a of teamAcc.values()) {
    const team = byId.get(a.team_id);
    if (!team) continue;
    const pythPct = pythagoreanWinPct(a.pf, a.pa);
    const expWins = pythPct * a.games;
    const apPct = a.ap_games ? (a.ap_wins + 0.5 * a.ap_ties) / a.ap_games : 0;
    rows.push({
      year: season.year,
      team_id: a.team_id,
      team: team.name,
      owner_names: team.owner_names,
      owner_ids: team.owner_ids,
      wins: a.wins,
      losses: a.losses,
      ties: a.ties,
      games: a.games,
      points_for: round2(a.pf),
      points_against: round2(a.pa),
      all_play_wins: a.ap_wins,
      all_play_losses: a.ap_losses,
      all_play_ties: a.ap_ties,
      all_play_games: a.ap_games,
      all_play_win_pct: round4(apPct),
      pyth_win_pct: round4(pythPct),
      pyth_expected_wins: round2(expWins),
      luck_vs_pyth: round2(a.wins - expWins),
      luck_vs_all_play: round2(a.wins - apPct * a.games),
    });
  }
  return rows;
}

export function computeWhatIfOwnerRows(): WhatIfOwnerRow[] {
  const teamRows = computeWhatIfTeamRows();
  // Aggregate by owner — co-owners each get a slice (each gets credit for the team-season)
  type Acc = {
    owner_id: string;
    display_name: string;
    seasons: Set<string>;
    aw: number;
    al: number;
    at: number;
    ew: number;
    apw: number;
    apl: number;
    apt: number;
    apg: number;
    games: number;
    pf: number;
    pa: number;
  };
  const acc = new Map<string, Acc>();
  for (const r of teamRows) {
    for (let i = 0; i < r.owner_ids.length; i++) {
      const oid = r.owner_ids[i];
      const name = r.owner_names[i] ?? oid;
      let a = acc.get(oid);
      if (!a) {
        a = {
          owner_id: oid,
          display_name: name,
          seasons: new Set(),
          aw: 0,
          al: 0,
          at: 0,
          ew: 0,
          apw: 0,
          apl: 0,
          apt: 0,
          apg: 0,
          games: 0,
          pf: 0,
          pa: 0,
        };
        acc.set(oid, a);
      }
      a.seasons.add(`${r.year}:${r.team_id}`);
      a.aw += r.wins;
      a.al += r.losses;
      a.at += r.ties;
      a.ew += r.pyth_expected_wins;
      a.apw += r.all_play_wins;
      a.apl += r.all_play_losses;
      a.apt += r.all_play_ties;
      a.apg += r.all_play_games;
      a.games += r.games;
      a.pf += r.points_for;
      a.pa += r.points_against;
    }
  }
  return [...acc.values()].map((a) => {
    const pythPct = pythagoreanWinPct(a.pf, a.pa);
    const apPct = a.apg ? (a.apw + 0.5 * a.apt) / a.apg : 0;
    const actualPct = a.games ? (a.aw + 0.5 * a.at) / a.games : 0;
    return {
      owner_id: a.owner_id,
      display_name: a.display_name,
      seasons: a.seasons.size,
      actual_wins: a.aw,
      actual_losses: a.al,
      actual_ties: a.at,
      expected_wins: round2(a.ew),
      all_play_wins: a.apw,
      all_play_losses: a.apl,
      all_play_ties: a.apt,
      all_play_games: a.apg,
      luck_vs_pyth: round2(a.aw - a.ew),
      luck_vs_all_play: round2(a.aw - apPct * a.games),
      pyth_win_pct: round4(pythPct),
      all_play_win_pct: round4(apPct),
      actual_win_pct: round4(actualPct),
    } satisfies WhatIfOwnerRow;
  });
}

function pythagoreanWinPct(pf: number, pa: number): number {
  if (pf <= 0 && pa <= 0) return 0;
  const pfp = Math.pow(pf, PYTHAG_EXPONENT);
  const pap = Math.pow(pa, PYTHAG_EXPONENT);
  return pfp / (pfp + pap);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
