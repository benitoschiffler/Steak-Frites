"""Compute player-level stats and per-season MVPs from box scores.

Inputs: data/seasons/<year>.json (only years with box_scores → 2019+).
Output: data/players.json with:
  - all_time_top_by_position: top single-week performances per position
  - season_top_by_position: top performances per season per position
  - winning_team_appearances: players most often on winning weekly rosters
  - mvps_by_season: regular-season + playoff MVP per season with methodology
"""
from __future__ import annotations

import json
from collections import defaultdict
from typing import Any

from .config import YEARS, DATA_DIR, SEASONS_DIR, EXCLUDED_RECORD_YEARS

# Slot codes that mean "this player was in the starting lineup" for the week.
# Anything else (BE, IR) is bench / not contributing to the team's box score.
BENCH_SLOTS = {"BE", "IR"}

# Standard positions we surface in leaderboards. Anything else is grouped as
# OTHER (rare — DL/LB/etc. from defensive leagues, occasional 'HC' coaches).
POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "D/ST"]


def _started(slot: str | None) -> bool:
    if not slot:
        return False
    return slot not in BENCH_SLOTS


def _load_seasons():
    out = []
    for y in YEARS:
        p = SEASONS_DIR / f"{y}.json"
        if not p.exists():
            continue
        out.append(json.loads(p.read_text()))
    return out


def _matchup_winners_for_season(season: dict) -> dict[tuple[int, int], dict]:
    """Return {(week, team_id): {won: bool, opp_team_id, team_score, is_playoff}}.

    Lets us look up "did this team win this week and was it a playoff game".
    """
    out: dict[tuple[int, int], dict] = {}
    for m in season.get("matchups", []):
        if m.get("home_score") is None or m.get("away_score") is None:
            continue
        if m.get("home_team_id") is None or m.get("away_team_id") is None:
            continue
        hs, as_ = m["home_score"], m["away_score"]
        hid, aid = m["home_team_id"], m["away_team_id"]
        wk = m["week"]
        is_playoff = bool(m.get("is_playoff"))
        out[(wk, hid)] = {
            "won": hs > as_,
            "tied": hs == as_,
            "opp_team_id": aid,
            "team_score": hs,
            "is_playoff": is_playoff,
        }
        out[(wk, aid)] = {
            "won": as_ > hs,
            "tied": hs == as_,
            "opp_team_id": hid,
            "team_score": as_,
            "is_playoff": is_playoff,
        }
    return out


def _team_lookup(season: dict) -> dict[int, dict]:
    return {t["team_id"]: t for t in season["teams"]}


def _team_meta(team: dict | None) -> dict:
    if not team:
        return {"team_id": None, "team_name": None, "owner_ids": [], "owner_names": []}
    return {
        "team_id": team["team_id"],
        "team_name": team["name"],
        "owner_ids": list(team.get("owner_ids", [])),
        "owner_names": list(team.get("owner_names", [])),
    }


def _enrich_perf(row: dict, season: dict, week: int, winners: dict) -> dict:
    teams = _team_lookup(season)
    t = teams.get(row.get("team_id"))
    info = _team_meta(t)
    res = winners.get((week, row.get("team_id"))) or {}
    return {
        "year": season["year"],
        "week": week,
        "player_id": row.get("player_id"),
        "player_name": row.get("player_name"),
        "position": row.get("position"),
        "slot_position": row.get("slot_position"),
        "pro_team": row.get("pro_team"),
        "points": float(row.get("points") or 0),
        "started": _started(row.get("slot_position")),
        "team_id": info["team_id"],
        "team_name": info["team_name"],
        "owner_ids": info["owner_ids"],
        "owner_names": info["owner_names"],
        "team_won": res.get("won"),
        "is_playoff": res.get("is_playoff", False),
    }


def compute() -> dict[str, Any]:
    seasons = _load_seasons()

    # Flatten all (player-week-team) performances across every season with box scores.
    perfs_started: list[dict] = []   # only starting lineup performances
    perfs_all_roster: list[dict] = []  # all rostered (incl. bench) — for winning-team count
    for s in seasons:
        if s["year"] in EXCLUDED_RECORD_YEARS:
            continue
        bx = s.get("box_scores") or {}
        if not bx:
            continue
        winners = _matchup_winners_for_season(s)
        for week_key, rows in bx.items():
            week = int(week_key)
            for row in rows:
                if not row.get("player_id"):
                    continue
                enriched = _enrich_perf(row, s, week, winners)
                perfs_all_roster.append(enriched)
                if enriched["started"]:
                    perfs_started.append(enriched)

    # ─── Top single-week performances by position (all-time) ──────────────
    by_pos_all_time: dict[str, list[dict]] = defaultdict(list)
    for p in perfs_started:
        pos = p.get("position") or "OTHER"
        if pos not in POSITION_ORDER:
            pos = "OTHER"
        by_pos_all_time[pos].append(p)
    all_time_top_by_position: dict[str, list[dict]] = {}
    for pos in POSITION_ORDER + (["OTHER"] if "OTHER" in by_pos_all_time else []):
        if pos not in by_pos_all_time:
            continue
        ranked = sorted(by_pos_all_time[pos], key=lambda x: x["points"], reverse=True)[:15]
        all_time_top_by_position[pos] = ranked

    # ─── Top performances per season per position ─────────────────────────
    season_top_by_position: dict[str, dict[str, list[dict]]] = {}
    for s in seasons:
        if s["year"] in EXCLUDED_RECORD_YEARS:
            continue
        bx = s.get("box_scores") or {}
        if not bx:
            continue
        year_perfs = [p for p in perfs_started if p["year"] == s["year"]]
        by_pos: dict[str, list[dict]] = defaultdict(list)
        for p in year_perfs:
            pos = p.get("position") or "OTHER"
            if pos not in POSITION_ORDER:
                pos = "OTHER"
            by_pos[pos].append(p)
        season_top_by_position[str(s["year"])] = {
            pos: sorted(by_pos[pos], key=lambda x: x["points"], reverse=True)[:5]
            for pos in POSITION_ORDER
            if pos in by_pos
        }

    # ─── Most frequently on winning teams ─────────────────────────────────
    # For each player across all seasons, count weeks where:
    #   - they were rostered (started or bench), AND
    #   - their team won that week
    # plus tie-break stats.
    player_agg: dict[int, dict] = {}
    for p in perfs_all_roster:
        pid = p["player_id"]
        if pid is None:
            continue
        rec = player_agg.setdefault(
            pid,
            {
                "player_id": pid,
                "player_name": p["player_name"],
                "position": p["position"],
                "weeks_rostered": 0,
                "weeks_started": 0,
                "wins_when_rostered": 0,
                "wins_when_started": 0,
                "total_points": 0.0,
                "seasons": set(),
                "teams_appeared_on": set(),  # (year, team_id, team_name)
                "last_year": p["year"],
            },
        )
        rec["weeks_rostered"] += 1
        rec["seasons"].add(p["year"])
        if p["team_id"] and p["team_name"]:
            rec["teams_appeared_on"].add((p["year"], p["team_id"], p["team_name"]))
        if p["year"] > rec["last_year"]:
            rec["last_year"] = p["year"]
        if p["team_won"]:
            rec["wins_when_rostered"] += 1
        if p["started"]:
            rec["weeks_started"] += 1
            rec["total_points"] += p["points"]
            if p["team_won"]:
                rec["wins_when_started"] += 1
    winning_team_appearances = []
    for rec in player_agg.values():
        if rec["weeks_started"] < 5:  # filter out tiny samples
            continue
        winning_team_appearances.append(
            {
                "player_id": rec["player_id"],
                "player_name": rec["player_name"],
                "position": rec["position"],
                "weeks_started": rec["weeks_started"],
                "wins_when_started": rec["wins_when_started"],
                "win_rate_when_started": round(
                    rec["wins_when_started"] / rec["weeks_started"], 4
                ),
                "total_starting_points": round(rec["total_points"], 2),
                "ppg_started": round(
                    rec["total_points"] / rec["weeks_started"], 2
                ),
                "seasons_count": len(rec["seasons"]),
                "last_year": rec["last_year"],
            }
        )
    winning_team_appearances.sort(
        key=lambda x: (-x["wins_when_started"], -x["win_rate_when_started"])
    )
    winning_team_appearances = winning_team_appearances[:50]

    # ─── MVP per season ───────────────────────────────────────────────────
    mvps_by_season: dict[str, dict] = {}
    for s in seasons:
        if s["year"] in EXCLUDED_RECORD_YEARS:
            continue
        bx = s.get("box_scores") or {}
        if not bx:
            continue
        year = s["year"]
        year_perfs = [p for p in perfs_started if p["year"] == year]
        teams = _team_lookup(s)

        # Per-team win/games for the regular season + playoffs
        reg_team_wins: dict[int, dict] = defaultdict(lambda: {"wins": 0, "games": 0})
        playoff_team_wins: dict[int, dict] = defaultdict(lambda: {"wins": 0, "games": 0})
        for m in s.get("matchups", []):
            if m.get("home_score") is None or m.get("away_score") is None:
                continue
            hs, as_ = m["home_score"], m["away_score"]
            hid, aid = m["home_team_id"], m["away_team_id"]
            bucket = playoff_team_wins if m.get("is_playoff") else reg_team_wins
            for tid, ts, opp in ((hid, hs, as_), (aid, as_, hs)):
                if tid is None:
                    continue
                bucket[tid]["games"] += 1
                if ts > opp:
                    bucket[tid]["wins"] += 1

        # Precompute team-week starting totals so winning_share is O(1) per row.
        team_week_total: dict[tuple[int, int], float] = defaultdict(float)
        for q in year_perfs:
            if q["team_id"] is None:
                continue
            team_week_total[(q["team_id"], q["week"])] += q["points"]

        # Regular season MVP candidates: aggregate by player_id over reg games only.
        reg_agg: dict[int, dict] = {}
        for p in year_perfs:
            if p["is_playoff"]:
                continue
            pid = p["player_id"]
            if pid is None:
                continue
            rec = reg_agg.setdefault(
                pid,
                {
                    "player_id": pid,
                    "player_name": p["player_name"],
                    "position": p["position"],
                    "team_id": p["team_id"],
                    "team_name": p["team_name"],
                    "owner_ids": p["owner_ids"],
                    "owner_names": p["owner_names"],
                    "starting_points": 0.0,
                    "games_started": 0,
                    "team_wins_when_started": 0,
                    "team_winning_share_sum": 0.0,
                },
            )
            rec["starting_points"] += p["points"]
            rec["games_started"] += 1
            if p["team_won"]:
                rec["team_wins_when_started"] += 1
            total = team_week_total.get((p["team_id"], p["week"]), 0)
            if total > 0:
                rec["team_winning_share_sum"] += p["points"] / total

        # Compose MVP score: weighted sum balancing volume + value-on-winners.
        # mvp_score = starting_points * (1 + 0.5 * team_win_rate) + 30 * winning_share_sum
        # Justification:
        #   - starting_points = the floor: you can't be MVP without scoring.
        #   - team_win_rate boost: scoring matters more if your scoring helped a winning roster.
        #   - winning_share_sum (× 30 weight, ~one full game): rewards being the
        #     biggest single contributor each week, not just having a high ceiling.
        reg_candidates = []
        for rec in reg_agg.values():
            if rec["games_started"] < 6:  # need at least a half-season to qualify
                continue
            team_id = rec["team_id"]
            team_stats = reg_team_wins.get(team_id, {"wins": 0, "games": 0})
            team_win_rate = (
                team_stats["wins"] / team_stats["games"] if team_stats["games"] else 0
            )
            ppg = rec["starting_points"] / rec["games_started"] if rec["games_started"] else 0
            mvp_score = (
                rec["starting_points"] * (1 + 0.5 * team_win_rate)
                + 30 * rec["team_winning_share_sum"]
            )
            reg_candidates.append(
                {
                    **rec,
                    "starting_points": round(rec["starting_points"], 2),
                    "ppg_started": round(ppg, 2),
                    "team_wins": team_stats["wins"],
                    "team_games": team_stats["games"],
                    "team_win_rate": round(team_win_rate, 4),
                    "team_winning_share_sum": round(rec["team_winning_share_sum"], 4),
                    "mvp_score": round(mvp_score, 2),
                }
            )
        reg_candidates.sort(key=lambda x: x["mvp_score"], reverse=True)

        # Playoff MVP — restrict to playoff weeks AND to the championship team.
        champ_team_id = None
        for t in s["teams"]:
            if t.get("final_standing") == 1:
                champ_team_id = t["team_id"]
                break
        playoff_mvp = None
        playoff_runners = []
        if champ_team_id is not None:
            playoff_agg: dict[int, dict] = {}
            for p in year_perfs:
                if not p["is_playoff"]:
                    continue
                if p["team_id"] != champ_team_id:
                    continue
                pid = p["player_id"]
                if pid is None:
                    continue
                rec = playoff_agg.setdefault(
                    pid,
                    {
                        "player_id": pid,
                        "player_name": p["player_name"],
                        "position": p["position"],
                        "team_id": p["team_id"],
                        "team_name": p["team_name"],
                        "owner_ids": p["owner_ids"],
                        "owner_names": p["owner_names"],
                        "starting_points": 0.0,
                        "games_started": 0,
                    },
                )
                rec["starting_points"] += p["points"]
                rec["games_started"] += 1
            # Compute best/worst single-week points per player during the playoff run
            best_week: dict[int, float] = defaultdict(lambda: float("-inf"))
            for p in year_perfs:
                if not p["is_playoff"] or p["team_id"] != champ_team_id:
                    continue
                if p["player_id"] in playoff_agg:
                    if p["points"] > best_week[p["player_id"]]:
                        best_week[p["player_id"]] = p["points"]

            playoff_list = sorted(
                [
                    {
                        **rec,
                        "starting_points": round(rec["starting_points"], 2),
                        "best_week_points": round(best_week[rec["player_id"]], 2) if rec["player_id"] in best_week else None,
                    }
                    for rec in playoff_agg.values()
                ],
                key=lambda x: x["starting_points"],
                reverse=True,
            )
            if playoff_list:
                playoff_mvp = playoff_list[0]
                playoff_runners = playoff_list[1:5]

        mvps_by_season[str(year)] = {
            "regular_season": {
                "mvp": reg_candidates[0] if reg_candidates else None,
                "runners_up": reg_candidates[1:5],
            },
            "playoff": {
                "mvp": playoff_mvp,
                "runners_up": playoff_runners,
                "champion_team_id": champ_team_id,
                "champion_team_name": teams.get(champ_team_id, {}).get("name") if champ_team_id else None,
            },
        }

    methodology = {
        "regular_season_mvp": (
            "MVP score = (total starting points across regular season) × "
            "(1 + 0.5 × team_win_rate) + 30 × Σ(weekly_winning_share). "
            "weekly_winning_share = player_points / team_total_starting_points for that week. "
            "Min 6 starting weeks to qualify. Bench points are excluded."
        ),
        "playoff_mvp": (
            "Highest total starting points on the championship-winning team during "
            "the playoff weeks. Simple and decisive — the player who carried them to the chip."
        ),
        "notes": (
            "Player data is sourced from ESPN box scores and is available from 2019 onward. "
            f"Excluded seasons: {sorted(EXCLUDED_RECORD_YEARS.keys())} (Sleeper)."
        ),
    }

    return {
        "all_time_top_by_position": all_time_top_by_position,
        "season_top_by_position": season_top_by_position,
        "winning_team_appearances": winning_team_appearances,
        "mvps_by_season": mvps_by_season,
        "methodology": methodology,
        "coverage": {
            "first_year_with_box_scores": min(
                (
                    s["year"]
                    for s in seasons
                    if s.get("box_scores") and s["year"] not in EXCLUDED_RECORD_YEARS
                ),
                default=None,
            ),
            "last_year_with_box_scores": max(
                (
                    s["year"]
                    for s in seasons
                    if s.get("box_scores") and s["year"] not in EXCLUDED_RECORD_YEARS
                ),
                default=None,
            ),
        },
    }


def main():
    print("Computing player stats + MVPs…")
    out = compute()
    (DATA_DIR / "players.json").write_text(json.dumps(out, indent=2, default=str))
    summary = {
        "positions_with_top": list(out["all_time_top_by_position"].keys()),
        "seasons_with_mvp": list(out["mvps_by_season"].keys()),
        "winning_team_leaders": len(out["winning_team_appearances"]),
        "coverage": out["coverage"],
    }
    print(f"  wrote {DATA_DIR / 'players.json'}: {summary}")


if __name__ == "__main__":
    main()
