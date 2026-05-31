"""Thin wrappers around espn_api + raw ESPN endpoints we need."""
from __future__ import annotations

import json
from typing import Any

import requests
from espn_api.football import League

from .config import LEAGUE_ID, league_kwargs, ESPN_S2, SWID

LM_HOST = "https://lm-api-reads.fantasy.espn.com"


def load_league(year: int) -> League:
    return League(**league_kwargs(year))


def _cookies() -> dict[str, str] | None:
    if ESPN_S2 and SWID:
        return {"espn_s2": ESPN_S2, "SWID": SWID}
    return None


def fetch_player_adp(year: int, limit: int = 600) -> list[dict[str, Any]]:
    """Pull average draft position for players in a given season.

    Returns a list of {player_id, name, position, pro_team, adp, percent_owned, rank_ppr, rank_standard}.
    """
    flt = {
        "players": {
            "limit": limit,
            "offset": 0,
            # ESPN requires a sort to accompany limit.
            "sortAdp": {"sortAsc": True, "sortPriority": 1},
            "filterRanksForRankTypes": {"value": ["STANDARD", "PPR"]},
        }
    }
    url = f"{LM_HOST}/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{LEAGUE_ID}"
    r = requests.get(
        url,
        params={"view": "kona_player_info"},
        headers={"x-fantasy-filter": json.dumps(flt)},
        cookies=_cookies(),
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    out = []
    pos_map = {1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST"}
    for entry in data.get("players", []):
        pl = entry.get("player", {}) or {}
        own = pl.get("ownership") or {}
        adp = own.get("averageDraftPosition")
        if adp is None or adp <= 0:
            continue
        ranks = pl.get("draftRanksByRankType") or {}
        out.append(
            {
                "player_id": pl.get("id"),
                "name": pl.get("fullName"),
                "position": pos_map.get(pl.get("defaultPositionId")),
                "pro_team_id": pl.get("proTeamId"),
                "adp": adp,
                "percent_owned": own.get("percentOwned"),
                "rank_standard": (ranks.get("STANDARD") or {}).get("rank"),
                "rank_ppr": (ranks.get("PPR") or {}).get("rank"),
            }
        )
    # Sort by ADP ascending
    out.sort(key=lambda x: x["adp"] if x["adp"] else 9999)
    return out
