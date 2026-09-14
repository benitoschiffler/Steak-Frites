"""Build transparent, phase-aware weekly power rankings from ESPN results.

The old workbook averaged ordinal ranks across six inputs.  This model keeps
the useful ideas (record, scoring, all-play, trend, consistency) but scores the
underlying values on a 0-100 scale so a narrow second place is not treated the
same as a distant one.  The output is shared by Newsroom, the public CSV feed,
and the Google Sheet editor desk.
"""
from __future__ import annotations

import json
import math
import statistics
from collections import defaultdict
from datetime import datetime, timezone

from .config import CURRENT_YEAR, DATA_DIR, SEASONS_DIR


def _read(path):
    return json.loads(path.read_text())


def _unique(values):
    seen = set()
    out = []
    for value in values:
        value = str(value or "").strip()
        key = value.casefold()
        if value and key not in seen:
            seen.add(key)
            out.append(value)
    return out


def _scale(values: dict[int, float], *, neutral: bool = False) -> dict[int, float]:
    """Min-max scale to 0-100, returning 50 when the sample has no spread."""
    if neutral or not values:
        return {key: 50.0 for key in values}
    lo, hi = min(values.values()), max(values.values())
    if math.isclose(lo, hi):
        return {key: 50.0 for key in values}
    return {key: 100.0 * (value - lo) / (hi - lo) for key, value in values.items()}


def _past_names(team: dict, owners_by_id: dict[str, dict], current_year: int) -> list[str]:
    names = []
    for owner_id in _unique(team.get("owner_ids") or []):
        owner = owners_by_id.get(owner_id)
        if not owner:
            continue
        for appearance in owner.get("appearances") or []:
            if int(appearance.get("year") or 0) >= current_year:
                continue
            names.append(appearance.get("team_name"))
    current = str(team.get("name") or "").strip().casefold()
    return [name for name in _unique(names) if name.casefold() != current]


def _scored_matchups(season: dict) -> list[dict]:
    rows = []
    for matchup in season.get("matchups") or []:
        if matchup.get("home_team_id") is None or matchup.get("away_team_id") is None:
            continue
        home = matchup.get("home_score")
        away = matchup.get("away_score")
        if home is None or away is None:
            continue
        # A scheduled 0-0 should not become a played game.
        if float(home) == 0 and float(away) == 0:
            continue
        rows.append(matchup)
    return rows


def _weights(week: int) -> dict[str, float]:
    if week <= 2:
        return {
            "all_play": 0.35,
            "scoring": 0.35,
            "recent": 0.0,
            "record": 0.20,
            "floor": 0.10,
        }
    return {
        "all_play": 0.30,
        "scoring": 0.25,
        "recent": 0.20,
        "record": 0.15,
        "floor": 0.10,
    }


def _summary(row: dict) -> str:
    lead = f'{row["ppg"]:.1f} PPG and a {row["all_play_pct"]:.0%} all-play rate'
    if row["games"] >= 3:
        lead += f', with {row["recent3_ppg"]:.1f} PPG over the latest three'
    luck = row["luck"]
    if luck >= 0.75:
        finish = f'The schedule has added roughly {luck:.1f} wins versus all-play expectation.'
    elif luck <= -0.75:
        finish = f'The schedule has cost roughly {abs(luck):.1f} wins versus all-play expectation.'
    else:
        finish = "The actual record is close to the all-play expectation."
    return f"{lead}. {finish}"


def rank_through_week(
    season: dict,
    owners: list[dict],
    cutoff_week: int,
    previous: dict[int, int] | None = None,
) -> list[dict]:
    teams = season.get("teams") or []
    team_ids = [int(team["team_id"]) for team in teams]
    matchups = [m for m in _scored_matchups(season) if int(m["week"]) <= cutoff_week]
    scores: dict[int, list[float]] = defaultdict(list)
    opponents: dict[int, list[float]] = defaultdict(list)
    wins = defaultdict(float)
    losses = defaultdict(float)
    ties = defaultdict(float)
    scores_by_week: dict[int, dict[int, float]] = defaultdict(dict)

    for matchup in matchups:
        home_id, away_id = int(matchup["home_team_id"]), int(matchup["away_team_id"])
        home, away = float(matchup["home_score"]), float(matchup["away_score"])
        scores[home_id].append(home)
        scores[away_id].append(away)
        opponents[home_id].append(away)
        opponents[away_id].append(home)
        scores_by_week[int(matchup["week"])][home_id] = home
        scores_by_week[int(matchup["week"])][away_id] = away
        if home > away:
            wins[home_id] += 1
            losses[away_id] += 1
        elif away > home:
            wins[away_id] += 1
            losses[home_id] += 1
        else:
            ties[home_id] += 1
            ties[away_id] += 1

    all_play_wins = defaultdict(float)
    all_play_losses = defaultdict(float)
    median_wins = defaultdict(float)
    for week_scores in scores_by_week.values():
        values = list(week_scores.values())
        median = statistics.median(values)
        for team_id, score in week_scores.items():
            for other_id, other_score in week_scores.items():
                if other_id == team_id:
                    continue
                if score > other_score:
                    all_play_wins[team_id] += 1
                elif score < other_score:
                    all_play_losses[team_id] += 1
                else:
                    all_play_wins[team_id] += 0.5
                    all_play_losses[team_id] += 0.5
            median_wins[team_id] += 1 if score > median else 0.5 if score == median else 0

    ppg = {team_id: statistics.mean(scores.get(team_id) or [0.0]) for team_id in team_ids}
    recent = {team_id: statistics.mean((scores.get(team_id) or [0.0])[-3:]) for team_id in team_ids}
    record_pct = {}
    all_play_pct = {}
    floor = {}
    for team_id in team_ids:
        games = len(scores.get(team_id) or [])
        record_pct[team_id] = (wins[team_id] + 0.5 * ties[team_id]) / max(1, games)
        ap_games = all_play_wins[team_id] + all_play_losses[team_id]
        all_play_pct[team_id] = all_play_wins[team_id] / max(1, ap_games)
        series = scores.get(team_id) or [0.0]
        floor[team_id] = statistics.mean(series) - (0.5 * statistics.pstdev(series) if len(series) >= 3 else 0)

    scoring_index = _scale(ppg)
    all_play_index = _scale(all_play_pct)
    record_index = _scale(record_pct)
    recent_index = _scale(recent, neutral=cutoff_week <= 2)
    floor_index = _scale(floor, neutral=cutoff_week < 3)
    weights = _weights(cutoff_week)
    owners_by_id = {owner["owner_id"]: owner for owner in owners}
    rows = []
    for team in teams:
        team_id = int(team["team_id"])
        games = len(scores.get(team_id) or [])
        score = (
            weights["all_play"] * all_play_index[team_id]
            + weights["scoring"] * scoring_index[team_id]
            + weights["recent"] * recent_index[team_id]
            + weights["record"] * record_index[team_id]
            + weights["floor"] * floor_index[team_id]
        )
        expected_wins = all_play_pct[team_id] * games
        actual_wins = wins[team_id] + 0.5 * ties[team_id]
        past_names = _past_names(team, owners_by_id, int(season["year"]))
        owner_names = _unique(team.get("owner_names") or [])
        owner_ids = _unique(team.get("owner_ids") or [])
        row = {
            "team_id": team_id,
            "owner_ids": owner_ids,
            "owners": owner_names,
            "owner": " & ".join(owner_names) or "Unknown owner",
            "team_name": str(team.get("name") or "").strip(),
            "past_team_names": past_names,
            "wins": int(wins[team_id]),
            "losses": int(losses[team_id]),
            "ties": int(ties[team_id]),
            "record": f'{int(wins[team_id])}-{int(losses[team_id])}' + (f'-{int(ties[team_id])}' if ties[team_id] else ''),
            "points_for": round(sum(scores.get(team_id) or []), 2),
            "points_against": round(sum(opponents.get(team_id) or []), 2),
            "games": games,
            "ppg": round(ppg[team_id], 2),
            "recent3_ppg": round(recent[team_id], 2),
            "all_play_wins": round(all_play_wins[team_id], 1),
            "all_play_losses": round(all_play_losses[team_id], 1),
            "all_play_pct": round(all_play_pct[team_id], 4),
            "expected_wins": round(expected_wins, 2),
            "luck": round(actual_wins - expected_wins, 2),
            "median_win_pct": round(median_wins[team_id] / max(1, games), 4),
            "floor_score": round(floor[team_id], 2),
            "score": round(score, 1),
            "previous_rank": previous.get(team_id) if previous else None,
        }
        rows.append(row)

    rows.sort(key=lambda row: (row["score"], row["ppg"], row["all_play_pct"]), reverse=True)
    for index, row in enumerate(rows, 1):
        row["rank"] = index
        row["movement"] = (row["previous_rank"] - index) if row["previous_rank"] else None
        row["explanation"] = _summary(row)
    return rows


def build() -> dict:
    season_path = SEASONS_DIR / f"{CURRENT_YEAR}.json"
    if not season_path.exists():
        raise FileNotFoundError(f"Missing current season: {season_path}")
    season = _read(season_path)
    owners = _read(DATA_DIR / "owners.json")
    weeks = sorted({int(m["week"]) for m in _scored_matchups(season)})
    history = []
    previous = None
    for week in weeks:
        rows = rank_through_week(season, owners, week, previous)
        history.append({"week": week, "rankings": rows})
        previous = {row["team_id"]: row["rank"] for row in rows}
    current = history[-1]["rankings"] if history else []
    latest_week = history[-1]["week"] if history else 0
    official_games = max((int(t.get("wins") or 0) + int(t.get("losses") or 0) + int(t.get("ties") or 0) for t in season.get("teams") or []), default=0)
    status = "official" if latest_week and official_games >= latest_week else "provisional"
    return {
        "season": CURRENT_YEAR,
        "week": latest_week,
        "status": status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "early_season": "Weeks 1-2: 35% all-play, 35% scoring, 20% record, 10% neutral floor. The live week is marked provisional until ESPN standings close.",
            "standard": "Week 3 onward: 30% all-play, 25% scoring, 20% latest-three form, 15% record, 10% scoring floor.",
            "editor": "The Google Sheet can add a bounded -5 to +5 editor adjustment and commentary. The model score always remains visible beside the published score.",
        },
        "rankings": current,
        "history": history,
    }


def main():
    payload = build()
    output = DATA_DIR / "power_rankings.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(f'Wrote {output}: {len(payload["rankings"])} teams through Week {payload["week"]} ({payload["status"]}).')


if __name__ == "__main__":
    main()
