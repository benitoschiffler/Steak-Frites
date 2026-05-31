# Steak Frites — League History

A living history site for the Steak Frites fantasy football league.

- **Records & fun facts:** all-time leaderboards, blowouts, scoring records, streaks, champions.
- **Per-season recaps:** standings, weekly results, drafts.
- **Owner profiles:** lifetime record, head-to-head matrix, keeper history, full draft history.
- **Keeper planner:** pick up to 2 players from your end-of-season roster, see if it's legal under the rules, see the cost (drafted round, or ADP-equivalent for repeat keepers).

## Architecture

```
.
├── pipeline/        # Python: pulls from ESPN, computes records & keepers, writes JSON
├── data/            # canonical JSON dataset (committed; rebuilt by pipeline)
├── web/             # Next.js 16 app (App Router, TS, Tailwind 4)
├── exports/         # raw CSV + Excel exports (gitignored; from older export_league.py)
└── .github/workflows/refresh.yml   # weekly refresh + auto-redeploy
```

## Local development

```bash
# 1. Pipeline (Python 3.12+)
pip install -r requirements.txt
ESPN_S2='…' SWID='{…}' python -m pipeline.build

# 2. Web app
cd web
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (also catches type errors)
```

### Cookies

ESPN now requires authentication for historical seasons even of public leagues. Get
your cookies from a logged-in browser session at fantasy.espn.com → DevTools →
Application → Cookies. You need `espn_s2` and `SWID` (keep the braces on SWID).

The cookies are read from env vars and never written to disk.

## Adding the next season

When the next ESPN season has data:

```bash
CURRENT_YEAR=2026 NEXT_YEAR=2027 \
ESPN_S2='…' SWID='{…}' \
python -m pipeline.build
```

You also need to update `pipeline/config.py` `CURRENT_YEAR` (or set the env var on
every run). The dynamic routes will pick up the new year automatically.

## Deployment (Vercel)

1. Create a Vercel project pointing at this repo, with **root directory = `web/`**.
2. No env vars needed at build time — the site is a static export reading
   the committed `data/` JSON.
3. Push to `main` → Vercel auto-deploys.

## Weekly auto-refresh

`.github/workflows/refresh.yml` runs every Tuesday during the season:

1. Reads ESPN cookies from repo secrets `ESPN_S2` and `SWID`.
2. Runs the pipeline.
3. Commits any data diff back to `main`.
4. Vercel sees the new commit and rebuilds.

Set the secrets in GitHub → repo Settings → Secrets → Actions:
- `ESPN_S2` — value of the `espn_s2` cookie
- `SWID` — value of the `SWID` cookie (including the braces)

You can also trigger a manual refresh via the Actions tab → "Refresh league data"
→ Run workflow.

## Keeper rules (encoded in `pipeline/config.py`)

- Max 2 keepers per team per season
- Rounds 1-3: cannot be kept
- Rounds 4-7: at most 1
- Rounds 8-16: at most 2
- Free agents count as last-round keepers (round 16)
- If a player is kept by the same team for back-to-back seasons or more,
  from season 2+ their keeper cost is their **ADP** (mapped to the
  equivalent draft round)

## Known limitations

- **Transactions:** ESPN's `recent_activity` endpoint returns
  "Communication Group does not exist" for this league because chat/activity
  was never initialized. The aggregate per-team counters (acquisitions, drops,
  trades) are still present in standings. See conversation history for full
  investigation.
- **Pre-2019 box scores:** ESPN's API doesn't expose player-level lineups for
  2016-2018. Team-level scores per matchup are still available.
- **Pre-2024 keepers:** ESPN's `keeper_status` flag was sparsely populated; what
  shows up is what ESPN recorded.
