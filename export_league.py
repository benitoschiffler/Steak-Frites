"""Export full history of ESPN fantasy league 113984 ("Steak Frites") to CSVs + Excel."""

import os
import json
import traceback
from pathlib import Path

import pandas as pd
from espn_api.football import League

LEAGUE_ID = 113984
# Allow overriding the year range and limiting to specific years via env
_years_env = os.environ.get("YEARS")
if _years_env:
    YEARS = [int(y) for y in _years_env.split(",") if y.strip()]
else:
    YEARS = list(range(2016, 2026))  # 2016..2025
ESPN_S2 = os.environ.get("ESPN_S2")
SWID = os.environ.get("SWID")
OUT = Path(__file__).parent / "exports"
CSV_DIR = OUT / "csv"
JSON_DIR = OUT / "json"
XLSX = OUT / "steak_frites_history.xlsx"

OUT.mkdir(exist_ok=True)
CSV_DIR.mkdir(exist_ok=True)
JSON_DIR.mkdir(exist_ok=True)


def owner_names(team):
    owners = getattr(team, "owners", None) or []
    names = []
    for o in owners:
        if isinstance(o, dict):
            fn = o.get("firstName", "") or ""
            ln = o.get("lastName", "") or ""
            dn = o.get("displayName", "") or ""
            label = (fn + " " + ln).strip() or dn or o.get("id", "")
            names.append(label)
        else:
            names.append(str(o))
    return ", ".join(names)


def collect_year(year):
    """Pull everything for a single season. Returns dict of DataFrames + raw settings."""
    print(f"\n=== {year} ===")
    kwargs = {"league_id": LEAGUE_ID, "year": year}
    if ESPN_S2 and SWID:
        kwargs["espn_s2"] = ESPN_S2
        kwargs["swid"] = SWID
    league = League(**kwargs)

    out = {"year": year, "league": league}

    # --- Teams / standings ---
    teams_rows = []
    for t in league.teams:
        teams_rows.append({
            "year": year,
            "team_id": t.team_id,
            "team_name": getattr(t, "team_name", ""),
            "abbrev": getattr(t, "team_abbrev", ""),
            "owners": owner_names(t),
            "wins": getattr(t, "wins", None),
            "losses": getattr(t, "losses", None),
            "ties": getattr(t, "ties", None),
            "points_for": getattr(t, "points_for", None),
            "points_against": getattr(t, "points_against", None),
            "acquisitions": getattr(t, "acquisitions", None),
            "drops": getattr(t, "drops", None),
            "trades": getattr(t, "trades", None),
            "playoff_pct": getattr(t, "playoff_pct", None),
            "standing": getattr(t, "standing", None),
            "final_standing": getattr(t, "final_standing", None),
            "division_id": getattr(t, "division_id", None),
            "division_name": getattr(t, "division_name", None),
        })
    out["standings"] = pd.DataFrame(teams_rows)

    team_by_id = {t.team_id: t for t in league.teams}

    # --- Draft ---
    draft_rows = []
    try:
        for pick in (league.draft or []):
            t = pick.team
            draft_rows.append({
                "year": year,
                "round": getattr(pick, "round_num", None),
                "round_pick": getattr(pick, "round_pick", None),
                "overall_pick": (
                    (getattr(pick, "round_num", 1) - 1) * len(league.teams)
                    + getattr(pick, "round_pick", 0)
                ) if getattr(pick, "round_num", None) else None,
                "team_id": getattr(t, "team_id", None) if t else None,
                "team_name": getattr(t, "team_name", None) if t else None,
                "player_id": getattr(pick, "playerId", None),
                "player_name": getattr(pick, "playerName", None),
                "bid_amount": getattr(pick, "bid_amount", None),
                "keeper_status": getattr(pick, "keeper_status", None),
                "nominating_team_id": getattr(getattr(pick, "nominatingTeam", None), "team_id", None),
            })
    except Exception as e:
        print(f"  draft error: {e}")
    out["draft"] = pd.DataFrame(draft_rows)

    # --- Matchups & box scores ---
    matchup_rows = []
    boxscore_rows = []

    # Determine how many weeks to walk through
    max_weeks = 18
    settings = getattr(league, "settings", None)
    reg_weeks = getattr(settings, "reg_season_count", None) or 14
    playoff_teams = getattr(settings, "playoff_team_count", None) or 6

    for week in range(1, max_weeks + 1):
        boxes = None
        try:
            boxes = league.box_scores(week)
        except Exception:
            boxes = None
        # Fallback to lighter scoreboard endpoint when box_scores returns nothing
        # (older seasons 2016-2018 don't have box_scores data).
        used_scoreboard = False
        if not boxes:
            try:
                boxes = league.scoreboard(week)
                used_scoreboard = bool(boxes)
            except Exception:
                boxes = None
        if not boxes:
            continue
        any_played = False
        for bx in boxes:
            home = getattr(bx, "home_team", None)
            away = getattr(bx, "away_team", None)
            home_score = getattr(bx, "home_score", None)
            away_score = getattr(bx, "away_score", None)
            if home is None and away is None:
                continue
            mtype = getattr(bx, "matchup_type", None) or getattr(bx, "playoff_tier_type", None)

            home_id = getattr(home, "team_id", None) if home else None
            away_id = getattr(away, "team_id", None) if away else None
            home_name = getattr(home, "team_name", None) if home else "BYE"
            away_name = getattr(away, "team_name", None) if away else "BYE"

            if (home_score or 0) > 0 or (away_score or 0) > 0:
                any_played = True

            matchup_rows.append({
                "year": year,
                "week": week,
                "matchup_type": mtype,
                "home_team_id": home_id,
                "home_team": home_name,
                "home_score": home_score,
                "away_team_id": away_id,
                "away_team": away_name,
                "away_score": away_score,
                "winner": (
                    home_name if (home_score or 0) > (away_score or 0)
                    else away_name if (away_score or 0) > (home_score or 0)
                    else "TIE"
                ),
            })

            # Box score line items (only available from box_scores endpoint)
            if used_scoreboard:
                continue
            for side, team, lineup in (
                ("home", home, getattr(bx, "home_lineup", []) or []),
                ("away", away, getattr(bx, "away_lineup", []) or []),
            ):
                for p in lineup:
                    boxscore_rows.append({
                        "year": year,
                        "week": week,
                        "side": side,
                        "team_id": getattr(team, "team_id", None) if team else None,
                        "team_name": getattr(team, "team_name", None) if team else None,
                        "player_id": getattr(p, "playerId", None),
                        "player_name": getattr(p, "name", None),
                        "position": getattr(p, "position", None),
                        "slot_position": getattr(p, "slot_position", None),
                        "pro_team": getattr(p, "proTeam", None),
                        "points": getattr(p, "points", None),
                        "projected_points": getattr(p, "projected_points", None),
                        "injury_status": getattr(p, "injuryStatus", None),
                    })
        if not any_played and week > reg_weeks + 5:
            break

    out["matchups"] = pd.DataFrame(matchup_rows)
    out["box_scores"] = pd.DataFrame(boxscore_rows)

    # --- Transactions / recent activity ---
    trans_rows = []
    try:
        activity = league.recent_activity(size=1000)
        for a in activity:
            date = getattr(a, "date", None)
            for act in (getattr(a, "actions", []) or []):
                # act is tuple (team, action_type, player, bid)
                team = act[0] if len(act) > 0 else None
                action_type = act[1] if len(act) > 1 else None
                player = act[2] if len(act) > 2 else None
                bid = act[3] if len(act) > 3 else None
                trans_rows.append({
                    "year": year,
                    "date_ms": date,
                    "team_id": getattr(team, "team_id", None) if team else None,
                    "team_name": getattr(team, "team_name", None) if team else None,
                    "action": action_type,
                    "player_name": getattr(player, "name", None) if player else None,
                    "player_id": getattr(player, "playerId", None) if player else None,
                    "bid": bid,
                })
    except Exception as e:
        print(f"  transactions error: {e}")
    out["transactions"] = pd.DataFrame(trans_rows)

    # --- Settings snapshot ---
    s = getattr(league, "settings", None)
    out["settings"] = {
        "year": year,
        "name": getattr(s, "name", None),
        "team_count": getattr(s, "team_count", None),
        "playoff_team_count": getattr(s, "playoff_team_count", None),
        "reg_season_count": getattr(s, "reg_season_count", None),
        "veto_votes_required": getattr(s, "veto_votes_required", None),
        "trade_deadline": getattr(s, "trade_deadline", None),
        "keeper_count": getattr(s, "keeper_count", None),
        "tie_rule": getattr(s, "tie_rule", None),
        "playoff_seed_tie_rule": getattr(s, "playoff_seed_tie_rule", None),
        "playoff_matchup_period_length": getattr(s, "playoff_matchup_period_length", None),
        "faab": getattr(s, "faab", None),
        "scoring_type": getattr(s, "scoring_type", None),
        "position_slot_counts": getattr(s, "position_slot_counts", None),
        "scoring_format": getattr(s, "scoring_format", None),
    }

    return out


def main():
    per_year = {}
    summaries = []
    for year in YEARS:
        try:
            data = collect_year(year)
            per_year[year] = data
            n_teams = len(data["standings"])
            n_matchups = len(data["matchups"])
            n_draft = len(data["draft"])
            n_box = len(data["box_scores"])
            n_tx = len(data["transactions"])
            print(f"  {year}: {n_teams} teams, {n_matchups} matchups, {n_draft} draft picks, {n_box} box rows, {n_tx} transactions")
            summaries.append({
                "year": year, "teams": n_teams, "matchups": n_matchups,
                "draft_picks": n_draft, "box_rows": n_box, "transactions": n_tx,
                "status": "ok",
            })

            # Per-year CSVs
            year_dir = CSV_DIR / str(year)
            year_dir.mkdir(exist_ok=True)
            data["standings"].to_csv(year_dir / "standings.csv", index=False)
            data["matchups"].to_csv(year_dir / "matchups.csv", index=False)
            data["draft"].to_csv(year_dir / "draft.csv", index=False)
            data["box_scores"].to_csv(year_dir / "box_scores.csv", index=False)
            data["transactions"].to_csv(year_dir / "transactions.csv", index=False)
            with open(JSON_DIR / f"settings_{year}.json", "w") as f:
                json.dump(data["settings"], f, indent=2, default=str)
        except Exception as e:
            print(f"  FAILED {year}: {e}")
            traceback.print_exc()
            summaries.append({"year": year, "status": f"error: {e}"})

    # Combined CSVs
    def concat(key):
        frames = [d[key] for d in per_year.values() if key in d and not d[key].empty]
        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    all_standings = concat("standings")
    all_matchups = concat("matchups")
    all_draft = concat("draft")
    all_box = concat("box_scores")
    all_tx = concat("transactions")

    all_standings.to_csv(CSV_DIR / "all_standings.csv", index=False)
    all_matchups.to_csv(CSV_DIR / "all_matchups.csv", index=False)
    all_draft.to_csv(CSV_DIR / "all_draft.csv", index=False)
    all_box.to_csv(CSV_DIR / "all_box_scores.csv", index=False)
    all_tx.to_csv(CSV_DIR / "all_transactions.csv", index=False)

    settings_rows = [d["settings"] for d in per_year.values() if "settings" in d]
    settings_df = pd.DataFrame(settings_rows)
    settings_df.to_csv(CSV_DIR / "all_settings.csv", index=False)

    summary_df = pd.DataFrame(summaries)
    summary_df.to_csv(CSV_DIR / "_summary.csv", index=False)

    # Excel workbook
    print("\nWriting Excel workbook...")
    with pd.ExcelWriter(XLSX, engine="openpyxl") as xw:
        summary_df.to_excel(xw, sheet_name="summary", index=False)
        settings_df.to_excel(xw, sheet_name="settings", index=False)
        all_standings.to_excel(xw, sheet_name="standings", index=False)
        all_matchups.to_excel(xw, sheet_name="matchups", index=False)
        all_draft.to_excel(xw, sheet_name="draft", index=False)
        # Box scores can be huge; only include if under Excel's row limit (1,048,576)
        if len(all_box) < 1_000_000:
            all_box.to_excel(xw, sheet_name="box_scores", index=False)
        else:
            pd.DataFrame([{"note": f"{len(all_box)} rows - see CSVs"}]).to_excel(
                xw, sheet_name="box_scores", index=False
            )
        all_tx.to_excel(xw, sheet_name="transactions", index=False)

    print(f"\nDone. Output: {OUT}")


if __name__ == "__main__":
    main()
