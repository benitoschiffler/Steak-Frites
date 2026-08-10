"""Refresh 10-team half-PPR ADP used by the keeper planner."""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import CURRENT_YEAR, DATA_DIR, NEXT_YEAR, SEASONS_DIR

ADP_SCORING = "half-ppr"
ADP_SOURCE = "Fantasy Football Calculator"
ADP_API_URL = "https://fantasyfootballcalculator.com/api/v1/adp/half-ppr"
ADP_PAGE_URL = "https://fantasyfootballcalculator.com/adp/half-ppr"


def _read_json(path) -> dict[str, Any]:
    return json.loads(path.read_text())


def _normalize_name(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    without_suffix = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", ascii_name)
    return re.sub(r"[^a-z0-9]+", "", without_suffix)


def _team_count() -> int:
    season = _read_json(SEASONS_DIR / f"{CURRENT_YEAR}.json")
    count = len(season.get("teams", []))
    if count < 2:
        raise ValueError(f"Could not determine team count from the {CURRENT_YEAR} season")
    return count


def _fetch_source(team_count: int) -> dict[str, Any]:
    query = urlencode({"teams": team_count, "year": NEXT_YEAR})
    request = Request(
        f"{ADP_API_URL}?{query}",
        headers={"User-Agent": "Steak-Frites-Keeper-Planner/1.0"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)
    meta = payload.get("meta") or {}
    players = payload.get("players") or []
    if payload.get("status") != "Success":
        raise ValueError(f"ADP provider returned status {payload.get('status')!r}")
    if meta.get("type") != "Half-PPR" or meta.get("teams") != team_count:
        raise ValueError(f"Unexpected ADP format: {meta}")
    if len(players) < 50:
        raise ValueError(f"ADP provider returned only {len(players)} players")
    return payload


def build_adp_payload() -> dict[str, Any]:
    team_count = _team_count()
    keepers = _read_json(DATA_DIR / "keepers.json")
    candidates = keepers["next_year_planning"]["candidates"]
    source = _fetch_source(team_count)
    source_meta = source["meta"]

    by_name = {_normalize_name(p["name"]): p for p in source["players"]}
    by_team_defense = {
        p.get("team"): p
        for p in source["players"]
        if p.get("position") == "DEF" and p.get("team")
    }

    matched: list[dict[str, Any]] = []
    unmatched: list[str] = []
    unmatched_repeat: list[str] = []
    for candidate in candidates:
        name = candidate.get("player_name") or ""
        source_player = by_name.get(_normalize_name(name))
        if source_player is None and candidate.get("position") == "D/ST":
            source_player = by_team_defense.get(candidate.get("pro_team"))
        if source_player is None:
            unmatched.append(name)
            if candidate.get("use_adp_next_year"):
                unmatched_repeat.append(name)
            continue

        matched.append(
            {
                "player_id": candidate["player_id"],
                "name": name,
                "position": candidate.get("position"),
                "pro_team": candidate.get("pro_team"),
                "adp": source_player["adp"],
                "times_drafted": source_player.get("times_drafted"),
                "source_player_id": source_player.get("player_id"),
            }
        )

    if unmatched_repeat:
        names = ", ".join(sorted(unmatched_repeat))
        raise ValueError(f"Missing half-PPR ADP for repeat-keeper candidates: {names}")

    matched.sort(key=lambda p: p["adp"])
    return {
        "year": NEXT_YEAR,
        "scoring_format": "0.5 PPR",
        "team_count": team_count,
        "pulled_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "name": ADP_SOURCE,
            "url": ADP_PAGE_URL,
            "api_url": ADP_API_URL,
            "drafts": source_meta.get("total_drafts"),
            "sample_start": source_meta.get("start_date"),
            "sample_end": source_meta.get("end_date"),
        },
        "coverage": {
            "keeper_candidates": len(candidates),
            "matched_candidates": len(matched),
            "unmatched_candidates": sorted(name for name in unmatched if name),
        },
        "players": matched,
    }


def main() -> None:
    payload = build_adp_payload()
    output = DATA_DIR / "adp.json"
    output.write_text(json.dumps(payload, indent=2))
    print(
        f"Half-PPR ADP: {len(payload['players'])}/{payload['coverage']['keeper_candidates']} "
        f"keeper candidates matched from {payload['source']['drafts']} drafts"
    )
    print(f"  wrote {output}")


if __name__ == "__main__":
    main()
