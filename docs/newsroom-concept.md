# Newsroom concept (paused)

The Newsroom was removed from the live site and refresh pipelines on 2026-09-16. This document preserves the product idea so it can be revived without keeping dormant routes, generated data, or automation in production.

## Product idea

A personalized, continuously refreshed league publication built from Steak Frites history and current-season facts. It should feel closer to ESPN or The Athletic than a generic stats page, with one or two clearly identified playful/tabloid voices for flavor.

The experience was designed around:

- Weekly record-watch stories, player eruptions, lineup regrets, and league trends.
- Offseason keeper reporting and power-ranking context.
- Clearly labeled story status: confirmed, projected, rumored, or analysis.
- Persistent reporter personas with serious or playful assignments.
- Direct links from stories into the Record Book and other evidence pages.
- League-specific history and owner context instead of generic fantasy-football copy.

The separate Versus head-to-head explorer remains part of the site; it is not dependent on the Newsroom.

## Editorial and data rules

- Build the factual layer deterministically from committed league data first.
- Treat ESPN keeper flags as confirmed only when the source records them.
- Keep transaction details labeled as rumor unless a reliable source confirms them.
- Never let prose generation change ids, facts, status, reporter assignment, confidence, or evidence.
- Default to zero-extra-cost deterministic copy. Optional AI prose polishing should be an explicit opt-in, not a requirement.
- If AI polishing returns invalid output or fails, publish the deterministic issue unchanged.

## Previous implementation shape

The retired implementation used:

- `pipeline/newsroom.py` to assemble deterministic articles from seasons, owners, records, keepers, ADP, players, and power rankings.
- `data/newsroom_config.json` for the publication name and stable reporter roster.
- `data/newsroom.json` as the generated site payload.
- `web/src/app/newsroom/page.tsx` for the publication surface.
- `pipeline/build.py` and the scheduled ADP workflow to regenerate stories alongside league data.

The data model included publication/issue metadata, a reporter roster, articles with evidence and confidence, and a current power-ranking snapshot.

## Sensible revival path

1. Reconfirm which desks are useful now: weekly recap, record watch, keepers, power rankings, and transactions.
2. Rebuild the deterministic article generator against the current data schemas.
3. Restore persistent reporter configuration and explicit fact/rumor labels.
4. Add the generated payload and route only after the deterministic output is useful on its own.
5. Wire story generation into one intentional refresh workflow; do not make unrelated ADP refreshes regenerate editorial content unless that dependency is still wanted.
6. Keep optional AI prose behind an explicit cost and credential decision.
7. Verify the route, evidence links, fallback behavior, build, and scheduled refresh before publishing.
