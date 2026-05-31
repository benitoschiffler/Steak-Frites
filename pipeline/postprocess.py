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
        p.write_text(json.dumps(data, indent=2, default=str))
        count += 1
    return count


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
