"""Build the committed Newsroom issue from league data.

The scoring and evidence are deterministic. When OPENAI_API_KEY is present the
copy is polished by the Responses API, but the model may only rewrite supplied
facts; it never decides rankings, keeper legality, or confidence.
"""
from __future__ import annotations

import json
import os
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations

from .config import DATA_DIR, CURRENT_YEAR, NEXT_YEAR


def _read(name: str):
    return json.loads((DATA_DIR / name).read_text())


def _round_from_adp(adp: float | None, teams: int, fallback: int = 16) -> int:
    if not adp:
        return fallback
    return max(1, min(fallback, int((adp - 1) // teams) + 1))


def _player_points(season: dict) -> dict[int, float]:
    totals: dict[int, float] = defaultdict(float)
    for rows in (season.get("box_scores") or {}).values():
        for row in rows:
            if (
                row.get("player_id")
                and row.get("slot_position")
                and row.get("slot_position") not in {"BE", "IR"}
            ):
                totals[row["player_id"]] += float(row.get("points") or 0)
    return totals


def _candidate_cost(c: dict, adp: dict[int, float], teams: int, last_round: int) -> tuple[int, str]:
    if c.get("use_adp_next_year"):
        return _round_from_adp(adp.get(c["player_id"]), teams, last_round), "ADP"
    if c.get("origin") == "free_agent" or c.get("base_round_this_year") is None:
        return last_round, "free agent"
    return int(c["base_round_this_year"]), "draft"


def _best_keeper_pair(candidates: list[dict], points: dict[int, float], adp: dict[int, float], teams: int, rules: dict):
    priced = []
    for c in candidates:
        rd, source = _candidate_cost(c, adp, teams, rules["free_agent_round"])
        if rd <= 3:
            continue
        value = points.get(c["player_id"], 0) + rd * 11
        priced.append({**c, "cost_round": rd, "cost_source": source, "score": value, "points": points.get(c["player_id"], 0)})
    legal = []
    for pair in combinations(priced, 2):
        mid = sum(1 for p in pair if 4 <= p["cost_round"] <= 7)
        late = sum(1 for p in pair if p["cost_round"] >= 8)
        if mid <= rules["max_rounds_4_to_7"] and late <= rules["max_rounds_8_to_16"]:
            legal.append(pair)
    if legal:
        return max(legal, key=lambda p: sum(x["score"] for x in p))
    return tuple(sorted(priced, key=lambda x: x["score"], reverse=True)[:1])


def _team_scores(season: dict) -> dict[int, list[float]]:
    scores: dict[int, list[tuple[int, float]]] = defaultdict(list)
    for m in season.get("matchups", []):
        if m.get("home_score") is not None and m.get("home_team_id"):
            scores[m["home_team_id"]].append((m["week"], float(m["home_score"])))
        if m.get("away_score") is not None and m.get("away_team_id"):
            scores[m["away_team_id"]].append((m["week"], float(m["away_score"])))
    return {tid: [v for _, v in sorted(rows)] for tid, rows in scores.items()}


def _power_rankings(season: dict) -> list[dict]:
    series = _team_scores(season)
    teams = season["teams"]
    ppgs = {t["team_id"]: (t["points_for"] / max(1, t["wins"] + t["losses"] + t["ties"])) for t in teams}
    lo, hi = min(ppgs.values()), max(ppgs.values())
    rows = []
    for t in teams:
        games = max(1, t["wins"] + t["losses"] + t["ties"])
        win_pct = (t["wins"] + .5 * t["ties"]) / games
        scoring = (ppgs[t["team_id"]] - lo) / max(.01, hi - lo)
        recent = series.get(t["team_id"], [])[-3:]
        recent_avg = sum(recent) / max(1, len(recent))
        recent_norm = max(0, min(1, (recent_avg - lo) / max(.01, hi - lo)))
        score = 100 * (.45 * win_pct + .35 * scoring + .20 * recent_norm)
        rows.append({"team": t, "score": score, "ppg": ppgs[t["team_id"]], "recent": recent_avg})
    rows.sort(key=lambda x: (x["score"], x["ppg"]), reverse=True)
    return [{
        "rank": i + 1, "previous_rank": None, "team_id": r["team"]["team_id"],
        "team_name": r["team"]["name"], "owners": r["team"]["owner_names"],
        "score": round(r["score"], 1),
        "record": f'{r["team"]["wins"]}-{r["team"]["losses"]}' + (f'-{r["team"]["ties"]}' if r["team"]["ties"] else ''),
        "explanation": f'{r["ppg"]:.1f} points per game with a {r["recent"]:.1f} average across the latest three scored matchups.'
    } for i, r in enumerate(rows)]


def _polish(articles: list[dict]) -> tuple[list[dict], str]:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return articles, "deterministic"
    payload = {
        "model": os.getenv("NEWSROOM_MODEL", "gpt-5.6-luna"),
        "instructions": "You edit a fantasy football league newsroom. Return only a JSON array. Preserve every id, fact, status, reporter_id, confidence, and evidence exactly. Rewrite only headline, dek, and body. Serious reporters sound like ESPN/The Athletic. Playful reporters may use one sharp tabloid-style joke but never invent facts or claim a rumor is confirmed.",
        "input": json.dumps(articles),
    }
    req = urllib.request.Request("https://api.openai.com/v1/responses", data=json.dumps(payload).encode(), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read())
        text = "".join(x.get("text", "") for item in result.get("output", []) for x in item.get("content", []) if x.get("type") == "output_text")
        polished = json.loads(text)
        if isinstance(polished, list) and {a.get("id") for a in polished} == {a["id"] for a in articles}:
            copy_by_id = {a["id"]: a for a in polished}
            safe = []
            for article in articles:
                rewrite = copy_by_id[article["id"]]
                safe.append({
                    **article,
                    "headline": str(rewrite.get("headline") or article["headline"]),
                    "dek": str(rewrite.get("dek") or article["dek"]),
                    "body": str(rewrite.get("body") or article["body"]),
                })
            return safe, "openai"
    except Exception as exc:
        print(f"Newsroom AI polish skipped: {exc}")
    return articles, "deterministic"


def main():
    meta = _read("meta.json")
    season = _read(f"seasons/{CURRENT_YEAR}.json")
    config = _read("newsroom_config.json")
    rankings_data = _read("power_rankings.json")
    records_data = _read("records.json")
    players_data = _read("players.json")
    now = datetime.now(timezone.utc).isoformat()
    reporters = config["reporters"]
    rankings = rankings_data.get("rankings") or []
    completed = [
        m for m in season.get("matchups", [])
        if m.get("home_score") is not None
        and m.get("away_score") is not None
        and ((m.get("home_score") or 0) > 0 or (m.get("away_score") or 0) > 0)
    ]
    week = max((int(m["week"]) for m in completed), default=0)
    teams = {t["team_id"]: t for t in season.get("teams", [])}
    week_team_rows = []
    for matchup in (m for m in completed if int(m["week"]) == week):
        for side, opponent in (("home", "away"), ("away", "home")):
            team_id = matchup.get(f"{side}_team_id")
            opponent_id = matchup.get(f"{opponent}_team_id")
            team = teams.get(team_id) or {}
            opponent_team = teams.get(opponent_id) or {}
            week_team_rows.append({
                "team_id": team_id,
                "team_name": team.get("name", "Unknown team"),
                "owner_names": team.get("owner_names") or ["Unknown owner"],
                "score": float(matchup.get(f"{side}_score") or 0),
                "opponent_team_id": opponent_id,
                "opponent_team_name": opponent_team.get("name", "Unknown team"),
                "opponent_owner_names": opponent_team.get("owner_names") or ["Unknown owner"],
                "opponent_score": float(matchup.get(f"{opponent}_score") or 0),
            })
    week_team_rows.sort(key=lambda row: row["score"], reverse=True)
    weekly_leader = week_team_rows[0] if week_team_rows else None
    weekly_heartbreak = next(
        (row for row in week_team_rows if row["score"] < row["opponent_score"]),
        None,
    )

    week_box = (season.get("box_scores") or {}).get(str(week), [])
    starters = sorted(
        [
            row
            for row in week_box
            if row.get("slot_position") and row.get("slot_position") not in {"BE", "IR"}
        ],
        key=lambda row: float(row.get("points") or 0),
        reverse=True,
    )
    bench = sorted(
        [row for row in week_box if row.get("slot_position") == "BE"],
        key=lambda row: float(row.get("points") or 0),
        reverse=True,
    )
    weekly_player = starters[0] if starters else None
    weekly_bench = bench[0] if bench else None

    articles = []
    if weekly_leader:
        history_key = "opening_week_highest" if week == 1 else "highest_single_game"
        history_rows = records_data.get(history_key) or []
        history_rank = next(
            (
                index + 1
                for index, row in enumerate(history_rows)
                if row.get("year") == CURRENT_YEAR
                and row.get("week") == week
                and row.get("team_id") == weekly_leader["team_id"]
            ),
            None,
        )
        history_phrase = (
            f'No. {history_rank} in league history for {"opening week" if week == 1 else "a single week"}'
            if history_rank else "outside the current all-time top 20"
        )
        articles.append({
            "id": f'{CURRENT_YEAR}-week-{week}-score-lead', "kind": "weekly", "label": "Record Watch", "status": "confirmed",
            "headline": f'{" & ".join(weekly_leader["owner_names"])} owns Week {week}’s high score',
            "dek": f'{weekly_leader["team_name"]} opened the record watch with {weekly_leader["score"]:.2f} points—{history_phrase.lower()}.',
            "body": f'The weekly crown belongs to {weekly_leader["team_name"]}. The score beat {weekly_leader["opponent_team_name"]} by {weekly_leader["score"] - weekly_leader["opponent_score"]:.2f} points and now has a permanent place in the Steak Frites archive.',
            "reporter_id": "ben-n-syder", "team_ids": [weekly_leader["team_id"]], "confidence": None,
            "evidence": [f'{weekly_leader["score"]:.2f} Week {week} points', history_phrase, f'{weekly_leader["opponent_score"]:.2f} opponent score'], "published_at": now,
        })

    if weekly_player:
        team = teams.get(weekly_player.get("team_id")) or {}
        opening_rows = players_data.get("opening_week_top") or []
        player_rank = next(
            (
                index + 1 for index, row in enumerate(opening_rows)
                if week == 1 and row.get("year") == CURRENT_YEAR
                and row.get("player_id") == weekly_player.get("player_id")
                and row.get("team_id") == weekly_player.get("team_id")
            ),
            None,
        )
        rank_fact = f'No. {player_rank} opening-week starter since 2019' if player_rank else f'Week {week} player leader'
        articles.append({
            "id": f'{CURRENT_YEAR}-week-{week}-player-eruption', "kind": "weekly", "label": "Player Eruption", "status": "confirmed",
            "headline": f'{weekly_player.get("player_name")} delivers the week’s biggest punch',
            "dek": f'{float(weekly_player.get("points") or 0):.2f} points from {weekly_player.get("position") or "a starter"} paced every player in the Steak Frites starting lineups.',
            "body": f'{weekly_player.get("player_name")} did the damage for {" & ".join(team.get("owner_names") or ["an unknown owner"])} on {team.get("name", "an unknown team")}. Player records use only starting-lineup points; bench scores live in their own hall of regret.',
            "reporter_id": "issac-cox", "team_ids": [weekly_player.get("team_id")], "confidence": None,
            "evidence": [f'{float(weekly_player.get("points") or 0):.2f} fantasy points', rank_fact, f'{weekly_player.get("position") or "Unknown"} · {weekly_player.get("pro_team") or "NFL team unavailable"}'], "published_at": now,
        })

    if weekly_heartbreak:
        articles.append({
            "id": f'{CURRENT_YEAR}-week-{week}-heartbreak', "kind": "weekly", "label": "Heartbreak Hotel", "status": "confirmed",
            "headline": f'{" & ".join(weekly_heartbreak["owner_names"])} scores {weekly_heartbreak["score"]:.2f} and still loses',
            "dek": f'{weekly_heartbreak["team_name"]} posted the highest losing score of Week {week}. There are no moral victories in the standings.',
            "body": f'{weekly_heartbreak["opponent_team_name"]} answered with {weekly_heartbreak["opponent_score"]:.2f}. That left a {weekly_heartbreak["opponent_score"] - weekly_heartbreak["score"]:.2f}-point gap and the kind of result the record book was built to preserve.',
            "reporter_id": "edith-puthy", "team_ids": [weekly_heartbreak["team_id"], weekly_heartbreak["opponent_team_id"]], "confidence": None,
            "evidence": [f'{weekly_heartbreak["score"]:.2f} points in defeat', f'{weekly_heartbreak["opponent_score"]:.2f} opponent points'], "published_at": now,
        })

    if weekly_bench and float(weekly_bench.get("points") or 0) > 0:
        playful = next(r for r in reporters if r["id"] == "harry-weiner")
        team = teams.get(weekly_bench.get("team_id")) or {}
        articles.append({
            "id": f'{CURRENT_YEAR}-week-{week}-bench-regret', "kind": "feature", "label": "Bench Regret", "status": "confirmed",
            "headline": f'{weekly_bench.get("player_name")} scores {float(weekly_bench.get("points") or 0):.2f} points for absolutely nobody',
            "dek": f'The week’s biggest bench eruption belonged to {" & ".join(team.get("owner_names") or ["an unknown owner"])}.',
            "body": f'{weekly_bench.get("player_name")} watched from the bench while piling up {float(weekly_bench.get("points") or 0):.2f} points. The points did not count toward {team.get("name", "the fantasy team")}, but the decision now counts forever.',
            "reporter_id": playful["id"], "team_ids": [weekly_bench.get("team_id")], "confidence": None,
            "evidence": [f'{float(weekly_bench.get("points") or 0):.2f} bench points', f'{weekly_bench.get("position") or "Unknown"} · {weekly_bench.get("pro_team") or "NFL team unavailable"}'], "published_at": now,
        })
    articles, generation = _polish(articles)
    output = {
        "publication": config.get("publication", "Newsroom"), "season": CURRENT_YEAR, "phase": "in_season",
        "issue_id": f"{CURRENT_YEAR}-week-{week}", "issue_label": f"{CURRENT_YEAR} · Week {week} Record Watch",
        "generated_at": now, "generation": generation, "reporters": reporters, "articles": articles,
        "power_rankings": rankings,
        "methodology": {
            "power_rankings": rankings_data["methodology"]["early_season"] if week <= 2 else rankings_data["methodology"]["standard"],
            "editorial": "Scores, lineup status and historical ranks are computed before any AI copy pass. Reporters may change assignments by story, but their serious or playful persona never changes.",
            "transactions": "ESPN keeper flags are treated as confirmed. Trade details require ESPN roster/activity evidence or a commissioner-confirmed event; model trade ideas are always labeled rumored."
        }
    }
    (DATA_DIR / "newsroom.json").write_text(json.dumps(output, indent=2) + "\n")
    print(f'Wrote Newsroom issue with {len(articles)} articles ({generation}).')


if __name__ == "__main__":
    main()
