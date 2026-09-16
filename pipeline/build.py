"""End-to-end: pull from ESPN -> apply overrides -> compute site data.

For an ESPN-free re-process (e.g., after editing pipeline/overrides.py), use:

    python -m pipeline.postprocess && python -m pipeline.records && python -m pipeline.keepers && python -m pipeline.players && python -m pipeline.power_rankings
"""
from . import adp, pull, postprocess, records, keepers, players, power_rankings


def main():
    pull.main()
    # Re-apply overrides to ensure they're consistently applied to the freshly
    # written seasons.json files (pull.py already does this once, but running
    # postprocess here is idempotent and keeps the owners.json index aligned).
    postprocess.main()
    records.main()
    keepers.main()
    try:
        adp.main()
    except Exception as exc:
        # The next season's public ADP feed is normally unavailable during the
        # fall. League standings and the rest of the site must not fail with it.
        print(f"ADP refresh skipped; preserving the last successful file: {exc}")
    players.main()
    power_rankings.main()


if __name__ == "__main__":
    main()
