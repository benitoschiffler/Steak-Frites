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
            if row.get("player_id") and row.get("slot_position") not in {"BE", "IR"}:
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
    keepers = _read("keepers.json")
    adp_data = _read("adp.json")
    config = _read("newsroom_config.json")
    adp = {p["player_id"]: p.get("adp") for p in adp_data.get("players", [])}
    points = _player_points(season)
    teams = {t["team_id"]: t for t in season["teams"]}
    rules = keepers["rules"]
    candidates = keepers["next_year_planning"]["candidates"]
    by_team: dict[int, list[dict]] = defaultdict(list)
    for c in candidates:
        by_team[c["team_id"]].append(c)
    now = datetime.now(timezone.utc).isoformat()
    reporters = config["reporters"]
    serious = [r for r in reporters if r["tone"] == "serious"]
    articles = []
    for idx, team in enumerate(sorted(teams.values(), key=lambda t: t["team_id"])):
        pair = _best_keeper_pair(by_team[team["team_id"]], points, adp, len(teams), rules)
        if not pair:
            continue
        names = [p.get("player_name") or "Unknown" for p in pair]
        costs = [f'{p["player_name"]} (Round {p["cost_round"]}, {p["cost_source"]})' for p in pair]
        confidence = min(.94, .55 + sum(p["score"] for p in pair) / 1600)
        reporter = serious[idx % len(serious)]
        articles.append({
            "id": f'{NEXT_YEAR}-keeper-{team["team_id"]}', "kind": "keeper", "label": "Keeper Intel", "status": "projected",
            "headline": f'{" and ".join(names)} lead the keeper board for {team["name"].strip()}',
            "dek": f'{", ".join(team["owner_names"])} enter the offseason with a projected pairing built on legal cost and proven production.',
            "body": f'The Newsroom model currently favors {" and ".join(names)}. This is a projection—not a report of a submitted decision—and it will move with ADP, injuries and official keeper declarations.',
            "reporter_id": reporter["id"], "team_ids": [team["team_id"]], "confidence": round(confidence, 2),
            "evidence": costs + [f'{p["player_name"]}: {p["points"]:.1f} lineup points in {CURRENT_YEAR}' for p in pair], "published_at": now,
        })
    playful = next(r for r in reporters if r["id"] == "harry-weiner")
    articles.append({
        "id": f"{NEXT_YEAR}-keeper-market", "kind": "feature", "label": "Leaguewide Analysis", "status": "analysis",
        "headline": f"The {NEXT_YEAR} keeper market is officially taking shape", "dek": f"Ten rosters, two keeper slots each and no shortage of decisions that will age loudly.",
        "body": "The first Newsroom board evaluates every legal pairing using keeper cost and prior lineup production. Official decisions will replace projections as ESPN records them.",
        "reporter_id": playful["id"], "team_ids": [], "confidence": None,
        "evidence": [f"{len(candidates)} final-roster candidates evaluated", "Rounds 1-3 excluded", "Round-band limits enforced"], "published_at": now,
    })
    articles, generation = _polish(articles)
    output = {
        "publication": config.get("publication", "Newsroom"), "season": NEXT_YEAR, "phase": "offseason",
        "issue_id": f"{NEXT_YEAR}-offseason-1", "issue_label": f"{NEXT_YEAR} Offseason · Keeper Watch",
        "generated_at": now, "generation": generation, "reporters": reporters, "articles": articles,
        "power_rankings": _power_rankings(season),
        "methodology": {
            "power_rankings": "45% record, 35% season scoring strength, 20% latest-three scoring form. Weights will become phase-aware once the new season begins.",
            "editorial": "Rankings, legality and evidence are computed before any AI copy pass. Reporters may change assignments by story, but their serious or playful persona never changes.",
            "transactions": "ESPN keeper flags are treated as confirmed. Trade details require ESPN roster/activity evidence or a commissioner-confirmed event; model trade ideas are always labeled rumored."
        }
    }
    (DATA_DIR / "newsroom.json").write_text(json.dumps(output, indent=2) + "\n")
    print(f'Wrote Newsroom issue with {len(articles)} articles ({generation}).')


if __name__ == "__main__":
    main()
