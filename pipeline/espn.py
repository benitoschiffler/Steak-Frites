"""Thin wrapper around the ESPN fantasy-football client."""
from __future__ import annotations

from espn_api.football import League

from .config import league_kwargs


def load_league(year: int) -> League:
    return League(**league_kwargs(year))
