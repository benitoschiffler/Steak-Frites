"""End-to-end: pull from ESPN -> apply overrides -> compute records -> compute keepers.

For an ESPN-free re-process (e.g., after editing pipeline/overrides.py), use:

    python -m pipeline.postprocess && python -m pipeline.records && python -m pipeline.keepers
"""
from . import pull, postprocess, records, keepers


def main():
    pull.main()
    # Re-apply overrides to ensure they're consistently applied to the freshly
    # written seasons.json files (pull.py already does this once, but running
    # postprocess here is idempotent and keeps the owners.json index aligned).
    postprocess.main()
    records.main()
    keepers.main()


if __name__ == "__main__":
    main()
