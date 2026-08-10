"""End-to-end: pull from ESPN -> apply overrides -> compute records -> compute keepers.

For an ESPN-free re-process (e.g., after editing pipeline/overrides.py), use:

    python -m pipeline.postprocess && python -m pipeline.records && python -m pipeline.keepers && python -m pipeline.newsroom
"""
from . import adp, pull, postprocess, records, keepers, players, newsroom


def main():
    pull.main()
    # Re-apply overrides to ensure they're consistently applied to the freshly
    # written seasons.json files (pull.py already does this once, but running
    # postprocess here is idempotent and keeps the owners.json index aligned).
    postprocess.main()
    records.main()
    keepers.main()
    adp.main()
    players.main()
    newsroom.main()


if __name__ == "__main__":
    main()
