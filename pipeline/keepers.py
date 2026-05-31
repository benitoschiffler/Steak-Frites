"""Detect keepers (current + historical reconstruction) and codify keeper rules."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from .config import YEARS, DATA_DIR, SEASONS_DIR, KEEPER_RULES, CURRENT_YEAR, NEXT_YEAR


def _load_season(year: int) -> dict | None:
    p = SEASONS_DIR / f"{year}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def _final_rosters(season: dict) -> dict[int, list[dict]]:
    """For a season, return {team_id: [{player_id, player_name, ...}, ...]} as of the
    last week with box scores (the de-facto final roster).
    """
    bx = season.get("box_scores") or {}
    if not bx:
        return {}
    last_week = max(int(k) for k in bx.keys())
    rosters: dict[int, list[dict]] = defaultdict(list)
    for row in bx[str(last_week)] if isinstance(next(iter(bx.keys())), str) else bx[last_week]:
        if row.get("team_id") is None or row.get("player_id") is None:
            continue
        rosters[row["team_id"]].append(
            {
                "player_id": row["player_id"],
                "player_name": row["player_name"],
                "position": row["position"],
                "slot_position": row.get("slot_position"),
                "pro_team": row.get("pro_team"),
            }
        )
    return dict(rosters)


def _draft_lookup(season: dict) -> dict[int, dict]:
    """{player_id: {round, team_id, keeper_status, ...}} for that season's draft."""
    out = {}
    for p in season.get("draft", []):
        pid = p.get("player_id")
        if pid:
            out[pid] = p
    return out


def detect_keepers_for(year: int, prev_year: int) -> list[dict]:
    """A keeper in `year` = a pick where ESPN's keeper_status flag is set.
    We do NOT do roster-diff reconstruction because it generates false positives
    (any player on a team's roster who happened to be redrafted at market value).
    Pre-2021 seasons had keepers used informally without the flag being recorded,
    so detection is empty for those years."""
    season = _load_season(year)
    prev = _load_season(prev_year)
    if not season:
        return []

    prev_rosters = _final_rosters(prev) if prev else {}
    prev_draft = _draft_lookup(prev) if prev else {}
    out = []
    for pick in season.get("draft", []):
        pid = pick.get("player_id")
        team_id = pick.get("team_id")
        if not pid or not team_id:
            continue
        marked = bool(pick.get("keeper_status"))
        if not marked:
            continue
        on_prev_roster = any(p["player_id"] == pid for p in prev_rosters.get(team_id, []))
        # Where was this player drafted previously?
        prev_pick = prev_draft.get(pid)
        prev_round = prev_pick.get("round") if prev_pick else None
        prev_team_id = prev_pick.get("team_id") if prev_pick else None
        is_carryover = (prev_team_id == team_id) if prev_team_id else None
        origin = "free_agent" if not prev_pick else ("retained" if is_carryover else "acquired_then_kept")
        out.append(
            {
                "year": year,
                "team_id": team_id,
                "player_id": pid,
                "player_name": pick.get("player_name"),
                "kept_round_this_year": pick.get("round"),
                "kept_round_pick_this_year": pick.get("round_pick"),
                "previous_draft_round": prev_round,
                "previous_draft_team_id": prev_team_id,
                "espn_keeper_flag": marked,
                "on_previous_final_roster": on_prev_roster,
                "origin": origin,  # free_agent | retained | acquired_then_kept
            }
        )
    return out


def keeper_streaks() -> dict[tuple, int]:
    """Return {(team_id, player_id, year): consecutive_keeper_count_through_this_year}."""
    # Build list of all detected keepers across years
    all_keepers: list[dict] = []
    for y in YEARS:
        prev = y - 1
        if prev < YEARS[0]:
            continue
        all_keepers.extend(detect_keepers_for(y, prev))
    streaks: dict[tuple, int] = {}
    by_player_team = defaultdict(list)
    for k in all_keepers:
        by_player_team[(k["team_id"], k["player_id"])].append(k["year"])
    for (team_id, pid), years in by_player_team.items():
        years.sort()
        run = 0
        prev_y = None
        for y in years:
            if prev_y is None or y == prev_y + 1:
                run += 1
            else:
                run = 1
            streaks[(team_id, pid, y)] = run
            prev_y = y
    return streaks


def keeper_round_band(rd: int) -> str:
    """Map round → bucket used by the rules engine."""
    if rd is None:
        return "free_agent"
    if rd <= 3:
        return "blocked"      # rounds 1-3 can't be kept
    if 4 <= rd <= 7:
        return "rd_4_7"
    return "rd_8_16"          # 8+ all roll up to the 8-16 bucket


def evaluate_keeper_set(picks: list[dict]) -> dict:
    """Given a proposed set of {player, kept_round, is_repeat_year_2_plus},
    return {legal: bool, reasons: [...], details: [...]}.

    Rules (from user):
      - max 2 total
      - rounds 1-3: blocked
      - rounds 4-7: max 1
      - rounds 8-16: max 2
      - free agents: count as last-round (16) → fall into 8-16 bucket
      - if kept back-to-back+, from year 2+, "value" is ADP (frontend converts
        ADP -> equivalent round before passing here)
    """
    reasons = []
    legal = True
    if len(picks) > KEEPER_RULES["max_total"]:
        reasons.append(f"More than {KEEPER_RULES['max_total']} keepers selected.")
        legal = False

    bands = [keeper_round_band(p["kept_round"]) for p in picks]
    if any(b == "blocked" for b in bands):
        reasons.append("A selected player was drafted in rounds 1-3 (cannot be kept).")
        legal = False
    if bands.count("rd_4_7") > KEEPER_RULES["max_rounds_4_to_7"]:
        reasons.append("More than 1 keeper from rounds 4-7.")
        legal = False
    if bands.count("rd_8_16") > KEEPER_RULES["max_rounds_8_to_16"]:
        reasons.append("More than 2 keepers from rounds 8-16.")
        legal = False

    return {
        "legal": legal,
        "reasons": reasons,
        "details": [
            {
                "player_id": p.get("player_id"),
                "player_name": p.get("player_name"),
                "kept_round": p["kept_round"],
                "band": keeper_round_band(p["kept_round"]),
            }
            for p in picks
        ],
    }


def main():
    print("Detecting keepers…")
    streaks = keeper_streaks()
    keepers_by_year: dict[int, list[dict]] = defaultdict(list)
    for y in YEARS:
        prev = y - 1
        if prev < YEARS[0]:
            continue
        ks = detect_keepers_for(y, prev)
        for k in ks:
            k["consecutive_keeper_years"] = streaks.get(
                (k["team_id"], k["player_id"], y), 1
            )
        keepers_by_year[y] = ks

    # Build "what next year's roster looks like for keeper planning"
    # i.e. for the most recent season we have, who's eligible to be kept next season?
    candidates_for_next = []
    last_season = _load_season(CURRENT_YEAR)
    if last_season:
        last_draft = _draft_lookup(last_season)
        last_rosters = _final_rosters(last_season)
        # streak from current season's keepers
        current_keeper_streak = {
            (k["team_id"], k["player_id"]): k["consecutive_keeper_years"]
            for k in keepers_by_year.get(CURRENT_YEAR, [])
        }
        for team_id, players in last_rosters.items():
            for p in players:
                pid = p["player_id"]
                if not pid:
                    continue
                draft_pick = last_draft.get(pid)
                if draft_pick:
                    base_round = draft_pick.get("round")
                    base_origin = "drafted"
                    drafted_by = draft_pick.get("team_id")
                else:
                    base_round = None  # free agent
                    base_origin = "free_agent"
                    drafted_by = None
                # If they're already on a keeper streak with this team, year 2+ rule applies
                streak = current_keeper_streak.get((team_id, pid), 0)
                candidates_for_next.append(
                    {
                        "team_id": team_id,
                        "player_id": pid,
                        "player_name": p["player_name"],
                        "position": p["position"],
                        "pro_team": p.get("pro_team"),
                        "base_round_this_year": base_round,   # round in CURRENT_YEAR's draft
                        "origin": base_origin,                # drafted | free_agent
                        "drafted_by_team_id": drafted_by,
                        "consecutive_keeper_years_through_current": streak,
                        # If streak >= 1 already, next year would be year 2+ — use ADP
                        "use_adp_next_year": streak >= 1,
                    }
                )

    payload = {
        "keepers_by_year": keepers_by_year,
        "rules": KEEPER_RULES,
        "next_year_planning": {
            "for_year": NEXT_YEAR,
            "based_on_season": CURRENT_YEAR,
            "candidates": candidates_for_next,
        },
    }
    (DATA_DIR / "keepers.json").write_text(json.dumps(payload, indent=2, default=str))
    print(f"  wrote {DATA_DIR / 'keepers.json'}: years covered: {list(keepers_by_year.keys())}, "
          f"candidates for {NEXT_YEAR}: {len(candidates_for_next)}")


if __name__ == "__main__":
    main()
