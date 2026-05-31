import Link from "next/link";
import { loadPlayers } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";
import type { MvpRecord, PlayerPerformance, WinningTeamLeader } from "@/lib/types";

export const metadata = { title: "The Players — Steak Frites" };

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "D/ST"];

export default function PlayersPage() {
  const p = loadPlayers();
  const seasonsWithMvp = Object.keys(p.mvps_by_season)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="space-y-10">
      <header className="club-panel overflow-hidden rounded-xl">
        <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="text-[#f7d77d]">Player Dossier · Box-score coverage from {p.coverage.first_year_with_box_scores}</span>
          <span className="text-[#f7edda]/65">{seasonsWithMvp.length} seasons of MVPs</span>
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="text-3xl leading-none">🏈</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">The Players</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium text-[#f7edda]/78">
            Annual MVPs, the highest single-week scoring performances by position, and the
            players who showed up most often on winning rosters. Every name is a link back to
            the year / owner where it happened.
          </p>
        </div>
      </header>

      {/* ── Season MVPs ─────────────────────────────────────────────── */}
      <Section
        eyebrow="Hardware"
        title="Season MVPs"
        subtitle="Regular-season MVP rewards volume on a winning team. Playoff MVP is the top scorer on the championship squad during the playoffs."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {seasonsWithMvp.map((year) => {
            const m = p.mvps_by_season[String(year)];
            return (
              <div key={year} className="premium-panel overflow-hidden rounded-lg">
                <div className="flex items-baseline justify-between border-b border-black/10 bg-[#123d35]/[0.06] px-4 py-3">
                  <Link href={`/seasons/${year}`} className="text-xl font-black hover:text-[#123d35] hover:underline">
                    {year}
                  </Link>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a22]">
                    Season recap →
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 divide-y divide-black/5 sm:divide-y-0 sm:divide-x">
                  <MvpCell label="Regular Season MVP" mvp={m.regular_season.mvp} runners={m.regular_season.runners_up} variant="regular" />
                  <MvpCell
                    label="Playoff MVP"
                    mvp={m.playoff.mvp}
                    runners={m.playoff.runners_up}
                    variant="playoff"
                    championTeam={m.playoff.champion_team_name}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <details className="mt-4 rounded-lg border border-black/10 bg-[#fffdf7]/70 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-bold uppercase tracking-[0.14em] text-[#8a6a22]">
            How we pick the MVPs
          </summary>
          <div className="mt-3 space-y-2 text-[#5c5549]">
            <p>
              <strong>Regular Season MVP score</strong> = starting points × (1 + 0.5 × team
              win rate) + 30 × Σ weekly winning-share, where weekly winning-share is the
              player&apos;s share of their team&apos;s starting points that week. Minimum 6
              starting weeks to qualify. Bench points excluded.
            </p>
            <p>
              <strong>Playoff MVP</strong> = highest total starting points on the
              championship team during playoff weeks.
            </p>
            <p className="text-xs text-[#766d61]">
              {p.methodology.notes}
            </p>
          </div>
        </details>
      </Section>

      {/* ── All-time top by position ───────────────────────────────── */}
      <Section
        eyebrow="Stat-stuffer Hall"
        title="Top single-week performances by position"
        subtitle="The 15 best single-week starting-lineup performances at each position, all-time."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {POSITION_ORDER.filter((pos) => p.all_time_top_by_position[pos]).map((pos) => (
            <PositionTable key={pos} position={pos} rows={p.all_time_top_by_position[pos]} />
          ))}
        </div>
      </Section>

      {/* ── Winners' company ───────────────────────────────────────── */}
      <Section
        eyebrow="Lucky Charms"
        title="Most often on winning rosters"
        subtitle="Players whose starting weeks were most likely to coincide with a win."
      >
        <WinningRosterTable rows={p.winning_team_appearances} />
      </Section>
    </div>
  );
}

function MvpCell({
  label,
  mvp,
  runners,
  variant,
  championTeam,
}: {
  label: string;
  mvp: MvpRecord | null;
  runners: MvpRecord[];
  variant: "regular" | "playoff";
  championTeam?: string | null;
}) {
  return (
    <div className="p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a22]">{label}</div>
      {!mvp ? (
        <div className="mt-3 text-sm text-[#9a907f]">—</div>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{mvp.player_name}</span>
            {mvp.position && (
              <span className="badge py-1">{mvp.position}</span>
            )}
          </div>
          <div className="mt-1 text-sm font-medium text-[#5c5549]">
            <span className="font-bold">{mvp.team_name}</span>
            {mvp.owner_names?.length > 0 && (
              <>
                {" · "}
                {mvp.owner_names.map((n, i) => {
                  const id = mvp.owner_ids?.[i];
                  return (
                    <span key={`${id ?? n}-${i}`}>
                      {i > 0 && ", "}
                      {id ? (
                        <Link href={`/teams/${encodeURIComponent(id)}`} className="hover:underline hover:text-[#123d35]">
                          {n}
                        </Link>
                      ) : (
                        n
                      )}
                    </span>
                  );
                })}
              </>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {variant === "regular" ? (
              <>
                <Stat label="Total PF" value={fmt.pts(mvp.starting_points)} />
                <Stat label="PPG" value={fmt.pts(mvp.ppg_started ?? 0)} />
                <Stat
                  label="Team"
                  value={`${mvp.team_wins ?? 0}-${(mvp.team_games ?? 0) - (mvp.team_wins ?? 0)}`}
                />
                <Stat label="MVP Score" value={String(mvp.mvp_score?.toFixed(1) ?? "—")} accent />
                <Stat label="Win share" value={String((mvp.team_winning_share_sum ?? 0).toFixed(2))} />
                <Stat label="Starts" value={String(mvp.games_started)} />
              </>
            ) : (
              <>
                <Stat label="Playoff PF" value={fmt.pts(mvp.starting_points)} accent />
                <Stat label="Games" value={String(mvp.games_started)} />
                <Stat label="PPG" value={fmt.pts(mvp.starting_points / Math.max(mvp.games_started, 1))} />
              </>
            )}
          </div>
          {variant === "playoff" && championTeam && (
            <div className="mt-2 text-[11px] font-semibold text-[#9a907f]">
              On the {championTeam} championship run.
            </div>
          )}
          {runners.length > 0 && (
            <div className="mt-3 border-t border-black/5 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a907f]">
                Also in the race
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-[#5c5549]">
                {runners.slice(0, 3).map((r) => (
                  <li key={r.player_id} className="flex items-center gap-2">
                    <span className="font-bold">{r.player_name}</span>
                    {r.position && <span className="text-[10px] text-[#9a907f]">{r.position}</span>}
                    <span className="ml-auto tabular-nums">
                      {variant === "regular"
                        ? `score ${r.mvp_score?.toFixed(1)}`
                        : `${fmt.pts(r.starting_points)} pts`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border border-black/10 px-2 py-1.5 ${accent ? "bg-[#f1dfaa]/40" : "bg-[#fffdf7]/70"}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6a22]">{label}</div>
      <div className="mt-0.5 font-black tabular-nums">{value}</div>
    </div>
  );
}

function PositionTable({ position, rows }: { position: string; rows: PlayerPerformance[] }) {
  return (
    <div className="table-shell rounded-lg max-h-[420px] overflow-y-auto">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {position} — single-week leaderboard
      </div>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Rank</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Player</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">When</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">For Team</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.year}-${r.week}-${r.player_id}`} className="border-t border-black/5">
              <td className="px-3 py-2.5 align-top">
                <span className="rank-medal" data-rank={i + 1}>{i + 1}</span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-bold">{r.player_name}</div>
                {r.pro_team && <div className="text-[11px] text-[#766d61]">{r.pro_team}</div>}
              </td>
              <td className="px-3 py-2.5 align-top text-xs font-semibold text-[#766d61] whitespace-nowrap">
                <Link href={`/seasons/${r.year}`} className="hover:underline hover:text-[#123d35]">
                  {r.year} W{r.week}
                </Link>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="text-sm font-bold">{r.team_name ?? "—"}</div>
                <div className="text-[11px] text-[#766d61]">
                  {(r.owner_names ?? []).map((n, ix) => {
                    const id = r.owner_ids?.[ix];
                    return (
                      <span key={`${id ?? n}-${ix}`}>
                        {ix > 0 && ", "}
                        {id ? (
                          <Link href={`/teams/${encodeURIComponent(id)}`} className="hover:underline hover:text-[#123d35]">
                            {n}
                          </Link>
                        ) : (
                          n
                        )}
                      </span>
                    );
                  })}
                </div>
              </td>
              <td className="px-3 py-2.5 align-top text-right font-black tabular-nums">{fmt.pts(r.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WinningRosterTable({ rows }: { rows: WinningTeamLeader[] }) {
  return (
    <div className="table-shell rounded-lg max-h-[540px] overflow-y-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Rank</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Player</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Pos</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">Wins as Starter</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">Starts</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">Win %</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">Total PF</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">PPG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player_id} className="border-t border-black/5">
              <td className="px-3 py-2.5"><span className="rank-medal" data-rank={i + 1}>{i + 1}</span></td>
              <td className="px-3 py-2.5 font-bold">{r.player_name}</td>
              <td className="px-3 py-2.5">
                {r.position && <span className="badge py-1">{r.position}</span>}
              </td>
              <td className="px-3 py-2.5 text-right font-black tabular-nums">{r.wins_when_started}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.weeks_started}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{fmt.pct(r.win_rate_when_started)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmt.pts(r.total_starting_points)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmt.pts(r.ppg_started)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
