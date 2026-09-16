import Link from "next/link";
import { Section } from "@/components/Section";
import { fmt } from "@/lib/format";
import type { MvpRecord, PlayerData, WinningTeamLeader } from "@/lib/types";
import PlayerRecordTable from "./PlayerRecordTable";
import { RecordTableTitle } from "./shared";

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "D/ST"];

export type PlayerRecordBookData = Pick<
  PlayerData,
  | "all_time_top_by_position"
  | "winning_team_appearances"
  | "opening_week_top"
  | "biggest_bench_scores"
  | "biggest_carry_jobs"
  | "mvps_by_season"
  | "methodology"
  | "coverage"
>;

export default function PlayerRecordsSections({ players }: { players: PlayerRecordBookData }) {
  const seasonsWithMvp = Object.keys(players.mvps_by_season)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <>
      <Section
        eyebrow="Stat-stuffer Hall"
        title="Top single-week performances by position"
        subtitle="The 15 best starting-lineup performances at every position, all-time."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {POSITION_ORDER.filter((position) => players.all_time_top_by_position[position]).map(
            (position) => (
              <PlayerRecordTable
                key={position}
                rows={players.all_time_top_by_position[position]}
                title={`${position} — highest single-week scores`}
              />
            ),
          )}
        </div>
      </Section>

      <Section
        eyebrow="Hardware"
        title="Season MVPs"
        subtitle="Regular-season MVP rewards volume on a winning team. Playoff MVP is the top scorer on the championship squad during the playoffs."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {seasonsWithMvp.map((year) => {
            const season = players.mvps_by_season[String(year)];
            return (
              <div key={year} className="premium-panel overflow-hidden rounded-lg">
                <div className="flex items-baseline justify-between border-b border-black/10 bg-[#123d35]/[0.06] px-4 py-3">
                  <Link href={`/seasons/${year}`} className="text-xl font-black hover:text-[#123d35] hover:underline">
                    {year}
                  </Link>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a22]">Season recap →</span>
                </div>
                <div className="grid divide-y divide-black/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <MvpCell
                    label="Regular Season MVP"
                    mvp={season.regular_season.mvp}
                    runners={season.regular_season.runners_up}
                    variant="regular"
                  />
                  <MvpCell
                    label="Playoff MVP"
                    mvp={season.playoff.mvp}
                    runners={season.playoff.runners_up}
                    variant="playoff"
                    championTeam={season.playoff.champion_team_name}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <details className="mt-4 rounded-lg border border-black/10 bg-[#fffdf7]/70 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-bold uppercase tracking-[0.14em] text-[#8a6a22]">How we pick the MVPs</summary>
          <div className="mt-3 space-y-2 text-[#5c5549]">
            <p>
              <strong>Regular Season MVP score</strong> = starting points × (1 + 0.5 × team win rate) + 30 × Σ weekly winning-share, where weekly winning-share is the player&apos;s share of their team&apos;s starting points that week. Minimum 6 starting weeks to qualify. Bench points excluded.
            </p>
            <p><strong>Playoff MVP</strong> = highest total starting points on the championship team during playoff weeks.</p>
            <p className="text-xs text-[#766d61]">{players.methodology.notes}</p>
          </div>
        </details>
      </Section>

      <Section
        eyebrow="Opening Bell"
        title="Week 1 player records"
        subtitle={`The highest opening-week starter scores since box-score coverage began in ${players.coverage.first_year_with_box_scores}.`}
      >
        <PlayerRecordTable rows={players.opening_week_top} title="Highest opening-week player scores" />
      </Section>

      <Section
        eyebrow="Lineup Decisions"
        title="Bench nightmares and carry jobs"
        subtitle="The eruptions stranded on the bench, and the starters who supplied the biggest share of a team score."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerRecordTable rows={players.biggest_bench_scores} title="Most points left on the bench" />
          <PlayerRecordTable rows={players.biggest_carry_jobs} title="Biggest one-player carry jobs" metric="share" />
        </div>
      </Section>

      <Section
        eyebrow="Lucky Charms"
        title="Most often on winning rosters"
        subtitle="Players whose starting weeks were most likely to coincide with a win."
      >
        <WinningRosterTable rows={players.winning_team_appearances} />
      </Section>
    </>
  );
}

function MvpCell({ label, mvp, runners, variant, championTeam }: {
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
            {mvp.position ? <span className="badge py-1">{mvp.position}</span> : null}
          </div>
          <div className="mt-1 text-sm font-medium text-[#5c5549]">
            {mvp.owner_names?.length > 0 ? (
              <span className="font-bold">
                {mvp.owner_names.map((name, index) => {
                  const ownerId = mvp.owner_ids?.[index];
                  return (
                    <span key={`${ownerId ?? name}-${index}`}>
                      {index > 0 ? ", " : null}
                      {ownerId ? (
                        <Link href={`/teams/${encodeURIComponent(ownerId)}`} className="hover:text-[#123d35] hover:underline">{name}</Link>
                      ) : name}
                    </span>
                  );
                })}
              </span>
            ) : null}
            <span className="block text-xs text-[#8a8173]">{mvp.team_name}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {variant === "regular" ? (
              <>
                <Stat label="MVP Score" value={String(mvp.mvp_score?.toFixed(1) ?? "—")} accent />
                <Stat label="Total PF" value={fmt.pts(mvp.starting_points)} />
                <Stat label="PPG" value={fmt.pts(mvp.ppg_started ?? 0)} />
                <Stat label="Team Record" value={`${mvp.team_wins ?? 0}-${(mvp.team_games ?? 0) - (mvp.team_wins ?? 0)}`} />
              </>
            ) : (
              <>
                <Stat label="Playoff PF" value={fmt.pts(mvp.starting_points)} accent />
                <Stat label="Best Week" value={mvp.best_week_points != null ? fmt.pts(mvp.best_week_points) : "—"} />
                <Stat label="PPG" value={fmt.pts(mvp.starting_points / Math.max(mvp.games_started, 1))} />
                <Stat label="Games" value={String(mvp.games_started)} />
              </>
            )}
          </div>
          <div className="mt-3 text-[11px] font-medium leading-5 text-[#766d61]">
            {variant === "regular" ? (
              <>{mvp.games_started} starts · winning share {(mvp.team_winning_share_sum ?? 0).toFixed(2)} · team {fmt.pct(mvp.team_win_rate ?? 0)} regular-season win rate</>
            ) : championTeam ? (
              <>On the {championTeam} championship run.</>
            ) : null}
          </div>
          {runners.length > 0 ? (
            <div className="mt-3 border-t border-black/5 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a907f]">Also in the race</div>
              <ul className="mt-1 space-y-0.5 text-xs text-[#5c5549]">
                {runners.slice(0, 3).map((runner) => (
                  <li key={runner.player_id} className="flex items-center gap-2">
                    <span className="font-bold">{runner.player_name}</span>
                    {runner.position ? <span className="text-[10px] text-[#9a907f]">{runner.position}</span> : null}
                    <span className="ml-auto tabular-nums">
                      {variant === "regular" ? `score ${runner.mvp_score?.toFixed(1)}` : `${fmt.pts(runner.starting_points)} pts`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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

function WinningRosterTable({ rows }: { rows: WinningTeamLeader[] }) {
  return (
    <div className="table-shell max-h-[540px] overflow-y-auto rounded-lg">
      <RecordTableTitle>Winning-roster leaders</RecordTableTitle>
      <table className="min-w-full text-sm">
        <thead className="sticky top-11 z-10">
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
          {rows.map((row, index) => (
            <tr key={row.player_id} className="border-t border-black/5">
              <td className="px-3 py-2.5"><span className="rank-medal" data-rank={index + 1}>{index + 1}</span></td>
              <td className="px-3 py-2.5 font-bold">{row.player_name}</td>
              <td className="px-3 py-2.5">{row.position ? <span className="badge py-1">{row.position}</span> : null}</td>
              <td className="px-3 py-2.5 text-right font-black tabular-nums">{row.wins_when_started}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{row.weeks_started}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{fmt.pct(row.win_rate_when_started)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmt.pts(row.total_starting_points)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmt.pts(row.ppg_started)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
