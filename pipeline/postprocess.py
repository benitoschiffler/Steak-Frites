"""Re-apply overrides to existing seasons/*.json and rebuild the owners index.

Run this when you've tweaked `overrides.py` or `config.py` but the underlying
ESPN data is unchanged. Avoids re-pulling from ESPN.

    python -m pipeline.postprocess
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from .config import (
    YEARS, SEASONS_DIR, DATA_DIR, LEAGUE_ID, CURRENT_YEAR, NEXT_YEAR,
    EXCLUDED_RECORD_YEARS,
)
from .overrides import apply_overrides_to_team, apply_overrides_to_members
from .pull import build_owners_index


def reapply_overrides_to_existing_seasons() -> int:
    """Apply owner-id merges + display-name overrides to existing seasons.json
    files in-place. Returns the count of files updated."""
    count = 0
    for year in YEARS:
        p = SEASONS_DIR / f"{year}.json"
        if not p.exists():
            continue
        data = json.loads(p.read_text())
        apply_overrides_to_members(data.get("members", []))
        for t in data.get("teams", []):
            apply_overrides_to_team(t)
        # Strip ESPN's "continuation" weeks. After the fantasy championship is
        # decided, ESPN's API keeps reporting the final-week matchup data for
        # every remaining scoringPeriod (W17/W18 in 13-week regular-season
        # years, W18 in 14-week years). These aren't real games — they're
        # duplicate echoes that bloat single-week records and player MVPs.
        dedupe_continuation_weeks(data)
        p.write_text(json.dumps(data, indent=2, default=str))
        count += 1
    return count


def dedupe_continuation_weeks(season: dict) -> None:
    """Remove weeks whose matchups are byte-identical to the previous week —
    those are ESPN's post-championship 'continuation' weeks, not real games.

    Modifies season['matchups'] and season['box_scores'] in place.
    """
    matchups = season.get("matchups") or []
    if not matchups:
        return
    # Build per-week signature = tuple of sorted matchup tuples.
    by_week: dict[int, list[tuple]] = {}
    for m in matchups:
        sig = (
            m.get("home_team_id"),
            m.get("away_team_id"),
            m.get("home_score"),
            m.get("away_score"),
            m.get("matchup_type"),
        )
        by_week.setdefault(m["week"], []).append(sig)
    week_sigs = {w: tuple(sorted(sigs)) for w, sigs in by_week.items()}
    weeks = sorted(week_sigs.keys())
    continuation: set[int] = set()
    for i in range(1, len(weeks)):
        if week_sigs[weeks[i]] == week_sigs[weeks[i - 1]]:
            continuation.add(weeks[i])
    if not continuation:
        return
    # Strip matchups for continuation weeks
    season["matchups"] = [m for m in matchups if m.get("week") not in continuation]
    # Strip box_scores keys that are continuation weeks (keys are stringified ints)
    bx = season.get("box_scores") or {}
    if isinstance(bx, dict):
        for w in list(bx.keys()):
            try:
                if int(w) in continuation:
                    del bx[w]
            except (TypeError, ValueError):
                continue


def rewrite_meta() -> dict:
    """Refresh meta.json to reflect current config (current_year, excluded years, etc.)
    Preserves the original updated_at if present, so re-running postprocess doesn't
    falsify the data-freshness timestamp."""
    p = DATA_DIR / "meta.json"
    existing = json.loads(p.read_text()) if p.exists() else {}
    meta = {
        "league_id": LEAGUE_ID,
        "years": YEARS,
        "current_year": CURRENT_YEAR,
        "next_year": NEXT_YEAR,
        "excluded_record_years": {str(y): note for y, note in EXCLUDED_RECORD_YEARS.items()},
        "updated_at": existing.get("updated_at") or datetime.now(timezone.utc).isoformat(),
    }
    p.write_text(json.dumps(meta, indent=2))
    return meta


def main():
    n = reapply_overrides_to_existing_seasons()
    print(f"Re-applied overrides to {n} season files")
    owners = build_owners_index()
    (DATA_DIR / "owners.json").write_text(json.dumps(owners, indent=2, default=str))
    print(f"Rebuilt owners.json ({len(owners)} unique)")
    rewrite_meta()
    print("Rewrote meta.json")


if __name__ == "__main__":
    main()
