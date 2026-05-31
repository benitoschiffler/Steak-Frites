"""Compute all-time records and fun facts. Reads data/seasons/*.json -> writes records.json."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from .config import YEARS, DATA_DIR, SEASONS_DIR, EXCLUDED_RECORD_YEARS


def _load_seasons(include_excluded: bool = False):
    """Load every season's JSON. By default, skips years listed in
    EXCLUDED_RECORD_YEARS so they don't pollute records leaderboards."""
    out = []
    for y in YEARS:
        if not include_excluded and y in EXCLUDED_RECORD_YEARS:
            continue
        p = SEASONS_DIR / f"{y}.json"
        if not p.exists():
            continue
        out.append(json.loads(p.read_text()))
    return out


def _team_lookup(season):
    return {t["team_id"]: t for t in season["teams"]}


def compute() -> dict:
    seasons = _load_seasons()

    # Owner display lookup (canonical). Use names from owners.json so they
    # reflect overrides (e.g., "Ben Wolbransky").
    owners_path = DATA_DIR / "owners.json"
    owners_data = json.loads(owners_path.read_text()) if owners_path.exists() else []
    owner_display = {o["owner_id"]: o["display_name"] for o in owners_data}

    def _team_owner_names(team) -> list[str]:
        """Return de-duped, display-corrected owner names for a team."""
        seen = set()
        out = []
        for oid in team.get("owner_ids", []):
            if not oid or oid in seen:
                continue
            seen.add(oid)
            out.append(owner_display.get(oid, oid))
        # Fall back to whatever names the team has if id lookups produced nothing.
        return out or list(team.get("owner_names", []))

    # ─── Single-game records ──────────────────────────────────────────────
    games = []
    for s in seasons:
        teams = _team_lookup(s)
        for m in s["matchups"]:
            if m["home_score"] is None or m["away_score"] is None:
                continue
            if (m["home_score"] or 0) <= 0 and (m["away_score"] or 0) <= 0:
                continue
            hid, aid = m["home_team_id"], m["away_team_id"]
            home_team = teams.get(hid)
            away_team = teams.get(aid)
            if not home_team or not away_team:
                continue
            margin = abs(m["home_score"] - m["away_score"])
            games.append({
                "year": s["year"],
                "week": m["week"],
                "matchup_type": m["matchup_type"],
                "is_playoff": m["is_playoff"],
                "home_team_id": hid,
                "home_team": home_team["name"],
                "home_owners": _team_owner_names(home_team),
                "home_score": m["home_score"],
                "away_team_id": aid,
                "away_team": away_team["name"],
                "away_owners": _team_owner_names(away_team),
                "away_score": m["away_score"],
                "winner_team_id": hid if m["home_score"] > m["away_score"] else (aid if m["away_score"] > m["home_score"] else None),
                "loser_team_id": aid if m["home_score"] > m["away_score"] else (hid if m["away_score"] > m["home_score"] else None),
                "margin": margin,
                "combined": m["home_score"] + m["away_score"],
            })

    # Highest single-team scores
    team_games = []
    for g in games:
        team_games.append({
            **g,
            "team_id": g["home_team_id"], "team": g["home_team"], "owners": g["home_owners"],
            "score": g["home_score"],
            "opp_team_id": g["away_team_id"], "opp_team": g["away_team"], "opp_owners": g["away_owners"],
            "opp_score": g["away_score"],
        })
        team_games.append({
            **g,
            "team_id": g["away_team_id"], "team": g["away_team"], "owners": g["away_owners"],
            "score": g["away_score"],
            "opp_team_id": g["home_team_id"], "opp_team": g["home_team"], "opp_owners": g["home_owners"],
            "opp_score": g["home_score"],
        })

    highest_single = sorted(team_games, key=lambda x: x["score"], reverse=True)[:20]
    lowest_single = sorted([g for g in team_games if g["score"] > 0], key=lambda x: x["score"])[:20]
    biggest_blowouts = sorted(games, key=lambda x: x["margin"], reverse=True)[:20]
    closest_games = sorted([g for g in games if g["margin"] > 0], key=lambda x: x["margin"])[:20]
    highest_combined = sorted(games, key=lambda x: x["combined"], reverse=True)[:20]
    lowest_combined = sorted([g for g in games if g["combined"] > 0], key=lambda x: x["combined"])[:20]

    # ─── Season-level records ─────────────────────────────────────────────
    season_team_rows = []
    for s in seasons:
        for t in s["teams"]:
            games_played = (t["wins"] or 0) + (t["losses"] or 0) + (t["ties"] or 0)
            avg = (t["points_for"] / games_played) if games_played else 0
            season_team_rows.append({
                "year": s["year"],
                "team_id": t["team_id"],
                "team": t["name"],
                "owner_names": t["owner_names"],
                "owner_ids": t["owner_ids"],
                "wins": t["wins"],
                "losses": t["losses"],
                "ties": t["ties"],
                "points_for": round(t["points_for"], 2),
                "points_against": round(t["points_against"], 2),
                "games": games_played,
                "ppg": round(avg, 2),
                "final_standing": t["final_standing"],
            })

    highest_season_pf = sorted(season_team_rows, key=lambda x: x["points_for"], reverse=True)[:15]
    lowest_season_pf = sorted([x for x in season_team_rows if x["points_for"] > 0], key=lambda x: x["points_for"])[:15]
    best_season_ppg = sorted(season_team_rows, key=lambda x: x["ppg"], reverse=True)[:15]
    worst_season_ppg = sorted([x for x in season_team_rows if x["ppg"] > 0], key=lambda x: x["ppg"])[:15]
    best_records = sorted(season_team_rows, key=lambda x: (x["wins"], x["points_for"]), reverse=True)[:15]
    worst_records = sorted(season_team_rows, key=lambda x: (x["losses"], -x["points_for"]), reverse=True)[:15]

    # Championships (final_standing == 1) and runners-up (== 2)
    champions = [t for t in season_team_rows if t["final_standing"] == 1]
    runners_up = [t for t in season_team_rows if t["final_standing"] == 2]
    third_place = [t for t in season_team_rows if t["final_standing"] == 3]
    sackos = [t for t in season_team_rows if t["final_standing"] and t["final_standing"] >= 9]  # bottom finishers
    champions.sort(key=lambda x: x["year"])
    runners_up.sort(key=lambda x: x["year"])
    third_place.sort(key=lambda x: x["year"])

    # ─── Per-owner all-time aggregates ────────────────────────────────────
    owners = json.loads((DATA_DIR / "owners.json").read_text())
    owner_index = {o["owner_id"]: o for o in owners}

    # Build a per-(year, team_id) → owner_ids map.
    # owner_ids are deduped (after the override pass two co-owners may share
    # the same canonical id; we don't want to double-count their stats).
    def _dedup_preserving_order(seq):
        out, seen = [], set()
        for x in seq:
            if x and x not in seen:
                out.append(x)
                seen.add(x)
        return out

    team_to_owners = {}
    for s in seasons:
        for t in s["teams"]:
            team_to_owners[(s["year"], t["team_id"])] = (
                _dedup_preserving_order(t["owner_ids"]),
                t["owner_names"],
            )

    owner_stats = defaultdict(lambda: {
        "owner_id": None,
        "display_name": "",
        "seasons": 0,
        "wins": 0,
        "losses": 0,
        "ties": 0,
        "points_for": 0.0,
        "points_against": 0.0,
        "championships": 0,
        "runner_ups": 0,
        "third_place_finishes": 0,
        "playoff_appearances": 0,
        "best_finish": None,
        "worst_finish": None,
        "high_score": 0.0,
        "low_score": None,
    })

    # Aggregate from season totals
    for s in seasons:
        playoff_team_count = (s.get("settings") or {}).get("playoff_team_count") or 6
        for t in s["teams"]:
            for oid in _dedup_preserving_order(t["owner_ids"]):
                if not oid:
                    continue
                rec = owner_stats[oid]
                rec["owner_id"] = oid
                rec["display_name"] = owner_index.get(oid, {}).get("display_name", "")
                rec["seasons"] += 1
                rec["wins"] += t["wins"]
                rec["losses"] += t["losses"]
                rec["ties"] += t["ties"]
                rec["points_for"] += t["points_for"]
                rec["points_against"] += t["points_against"]
                fs = t["final_standing"]
                if fs == 1: rec["championships"] += 1
                elif fs == 2: rec["runner_ups"] += 1
                elif fs == 3: rec["third_place_finishes"] += 1
                if fs and fs <= playoff_team_count: rec["playoff_appearances"] += 1
                if fs:
                    rec["best_finish"] = fs if rec["best_finish"] is None else min(rec["best_finish"], fs)
                    rec["worst_finish"] = fs if rec["worst_finish"] is None else max(rec["worst_finish"], fs)

    # Aggregate single-game high/low scores per owner
    for tg in team_games:
        ids, _names = team_to_owners.get((tg["year"], tg["team_id"]), ([], []))
        for oid in ids:
            if not oid:
                continue
            rec = owner_stats[oid]
            if tg["score"] > rec["high_score"]:
                rec["high_score"] = tg["score"]
            if rec["low_score"] is None or tg["score"] < rec["low_score"]:
                if tg["score"] > 0:
                    rec["low_score"] = tg["score"]

    owner_table = []
    for oid, rec in owner_stats.items():
        gp = rec["wins"] + rec["losses"] + rec["ties"]
        rec["games_played"] = gp
        rec["win_pct"] = round((rec["wins"] + 0.5 * rec["ties"]) / gp, 4) if gp else 0
        rec["points_for"] = round(rec["points_for"], 2)
        rec["points_against"] = round(rec["points_against"], 2)
        rec["points_diff"] = round(rec["points_for"] - rec["points_against"], 2)
        rec["ppg"] = round(rec["points_for"] / gp, 2) if gp else 0
        owner_table.append(rec)
    owner_table.sort(key=lambda x: (-x["win_pct"], -x["points_for"]))

    # ─── All-time head-to-head matrix (owner vs owner) ────────────────────
    h2h = defaultdict(lambda: {"wins": 0, "losses": 0, "ties": 0, "points_for": 0.0, "points_against": 0.0})
    for g in games:
        h_ids, _ = team_to_owners.get((g["year"], g["home_team_id"]), ([], []))
        a_ids, _ = team_to_owners.get((g["year"], g["away_team_id"]), ([], []))
        if not h_ids or not a_ids:
            continue
        # Match every home-owner against every away-owner pairwise
        for hoid in h_ids:
            for aoid in a_ids:
                key = (hoid, aoid)
                rec = h2h[key]
                rec["points_for"] += g["home_score"]
                rec["points_against"] += g["away_score"]
                if g["home_score"] > g["away_score"]:
                    rec["wins"] += 1
                elif g["home_score"] < g["away_score"]:
                    rec["losses"] += 1
                else:
                    rec["ties"] += 1
    h2h_rows = []
    for (a, b), rec in h2h.items():
        h2h_rows.append({
            "owner_a": a, "owner_b": b,
            "wins": rec["wins"], "losses": rec["losses"], "ties": rec["ties"],
            "points_for": round(rec["points_for"], 2),
            "points_against": round(rec["points_against"], 2),
        })

    # ─── Streaks per owner ────────────────────────────────────────────────
    # Sort each owner's games chronologically and compute longest win/loss streaks
    owner_games = defaultdict(list)
    for g in games:
        ord_key = (g["year"], g["week"])
        for tid, score, opp_score, opp_tid in (
            (g["home_team_id"], g["home_score"], g["away_score"], g["away_team_id"]),
            (g["away_team_id"], g["away_score"], g["home_score"], g["home_team_id"]),
        ):
            ids, _ = team_to_owners.get((g["year"], tid), ([], []))
            for oid in ids:
                outcome = "W" if score > opp_score else ("L" if score < opp_score else "T")
                owner_games[oid].append((ord_key, outcome, g["year"], g["week"]))

    streaks = []
    for oid, lst in owner_games.items():
        lst.sort()
        # longest W streak
        cur_w = cur_l = max_w = max_l = 0
        w_range = l_range = None
        cur_w_start = cur_l_start = None
        for (key, outcome, y, w) in lst:
            if outcome == "W":
                if cur_w == 0: cur_w_start = (y, w)
                cur_w += 1
                if cur_w > max_w:
                    max_w = cur_w
                    w_range = (cur_w_start, (y, w))
                cur_l = 0
            elif outcome == "L":
                if cur_l == 0: cur_l_start = (y, w)
                cur_l += 1
                if cur_l > max_l:
                    max_l = cur_l
                    l_range = (cur_l_start, (y, w))
                cur_w = 0
            else:
                cur_w = cur_l = 0
        streaks.append({
            "owner_id": oid,
            "display_name": owner_index.get(oid, {}).get("display_name", ""),
            "longest_win_streak": max_w,
            "longest_loss_streak": max_l,
            "win_streak_range": w_range,
            "loss_streak_range": l_range,
        })
    streaks.sort(key=lambda x: x["longest_win_streak"], reverse=True)

    # ─── Per-week records ─────────────────────────────────────────────────
    weekly_high = sorted(team_games, key=lambda x: x["score"], reverse=True)[:5]
    weekly_low_real = sorted([g for g in team_games if g["score"] > 0], key=lambda x: x["score"])[:5]

    return {
        "excluded_years": {str(y): note for y, note in EXCLUDED_RECORD_YEARS.items()},
        "highest_single_game": highest_single,
        "lowest_single_game": lowest_single,
        "biggest_blowouts": biggest_blowouts,
        "closest_games": closest_games,
        "highest_combined": highest_combined,
        "lowest_combined": lowest_combined,
        "highest_season_pf": highest_season_pf,
        "lowest_season_pf": lowest_season_pf,
        "best_season_ppg": best_season_ppg,
        "worst_season_ppg": worst_season_ppg,
        "best_records": best_records,
        "worst_records": worst_records,
        "champions": champions,
        "runners_up": runners_up,
        "third_place": third_place,
        "sackos": sackos,
        "owner_alltime": owner_table,
        "head_to_head": h2h_rows,
        "streaks": streaks,
        "weekly_high": weekly_high,
        "weekly_low": weekly_low_real,
    }


def main():
    print("Computing records…")
    records = compute()
    (DATA_DIR / "records.json").write_text(json.dumps(records, indent=2, default=str))
    summary = {k: (len(v) if isinstance(v, list) else "obj") for k, v in records.items()}
    print(f"  wrote {DATA_DIR / 'records.json'}: {summary}")


if __name__ == "__main__":
    main()
