"""Shared configuration."""
import os
from pathlib import Path

LEAGUE_ID = 113984
FIRST_YEAR = 2016
# Current season defaults to env or auto from date. Update each fall.
CURRENT_YEAR = int(os.environ.get("CURRENT_YEAR", 2025))    # last completed season we have data for
NEXT_YEAR = int(os.environ.get("NEXT_YEAR", CURRENT_YEAR + 1))  # upcoming draft year - used for ADP / keeper planning
YEARS = list(range(FIRST_YEAR, CURRENT_YEAR + 1))

# Years that ran on a different platform (Sleeper) and whose ESPN data is not
# authoritative. The year stays in YEARS so it's reachable in the UI, but all
# records / leaderboards / aggregates skip it. The note is shown on relevant pages.
EXCLUDED_RECORD_YEARS: dict[int, str] = {
    2021: "Played on Sleeper — ESPN data not authoritative.",
}

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
SEASONS_DIR = DATA_DIR / "seasons"
SEASONS_DIR.mkdir(exist_ok=True)

ESPN_S2 = os.environ.get("ESPN_S2")
SWID = os.environ.get("SWID")


def league_kwargs(year: int):
    kw = {"league_id": LEAGUE_ID, "year": year}
    if ESPN_S2 and SWID:
        kw["espn_s2"] = ESPN_S2
        kw["swid"] = SWID
    return kw


# Keeper rules (codified, used by validator)
KEEPER_RULES = {
    "max_total": 2,
    "blocked_rounds": [1, 2, 3],          # cannot keep
    "max_rounds_4_to_7": 1,
    "max_rounds_8_to_16": 2,
    "free_agent_round": 16,                # FA = last-round keeper
}
