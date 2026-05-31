import Link from "next/link";
import { loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";

export const metadata = { title: "Records — Steak Frites" };

export default function RecordsPage() {
  const r = loadRecords();

  return (
    <div className="space-y-12">
      <header className="premium-panel rounded-xl p-6">
        <div className="kicker">Archive Room</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">League Records</h1>
        <p className="mt-2 max-w-2xl text-[#6f6a60]">
          Every leaderboard worth bragging about — or hiding from.
        </p>
        {Object.keys(r.excluded_years).length > 0 && (
          <div className="mt-5 rounded-lg border border-[#c8962d]/30 bg-[#f1dfaa]/40 px-4 py-3 text-sm font-medium text-[#5e3f06]">
            <strong>Note:</strong> Records do not include{" "}
            {Object.entries(r.excluded_years)
              .map(([y, note]) => `${y} (${note})`)
              .join("; ")}
          </div>
        )}
      </header>

      <Section eyebrow="Game Peaks" title="Single-game scoring" subtitle="Highest and lowest single-team scores ever recorded.">
        <div className="grid md:grid-cols-2 gap-4">
          <TeamGameTable rows={r.highest_single_game.slice(0, 10)} title="Highest" />
          <TeamGameTable rows={r.lowest_single_game.slice(0, 10)} title="Lowest" />
        </div>
      </Section>

      <Section eyebrow="Matchup Drama" title="Margin of victory" subtitle="Biggest blowouts and closest games of all time.">
        <div className="grid md:grid-cols-2 gap-4">
          <MatchupTable rows={r.biggest_blowouts.slice(0, 10)} title="Biggest blowouts" sortKey="margin" />
          <MatchupTable rows={r.closest_games.slice(0, 10)} title="Closest games" sortKey="margin" />
        </div>
      </Section>

      <Section eyebrow="Totals" title="Combined scores" subtitle="Shootouts and slugfests — total points by both teams.">
        <div className="grid md:grid-cols-2 gap-4">
          <MatchupTable rows={r.highest_combined.slice(0, 10)} title="Highest combined" sortKey="combined" />
          <MatchupTable rows={r.lowest_combined.slice(0, 10)} title="Lowest combined" sortKey="combined" />
        </div>
      </Section>

      <Section eyebrow="Season Marks" title="Single-season records" subtitle="Best and worst regular seasons (points for, win record).">
        <div className="grid md:grid-cols-2 gap-4">
          <SeasonTable rows={r.highest_season_pf.slice(0, 10)} title="Highest PF" col="points_for" />
          <SeasonTable rows={r.lowest_season_pf.slice(0, 10)} title="Lowest PF" col="points_for" />
          <SeasonTable rows={r.best_season_ppg.slice(0, 10)} title="Best PPG" col="ppg" />
          <SeasonTable rows={r.worst_season_ppg.slice(0, 10)} title="Worst PPG" col="ppg" />
        </div>
      </Section>

      <Section eyebrow="Momentum" title="Streaks" subtitle="Longest runs of consecutive wins and losses.">
        <div className="grid md:grid-cols-2 gap-4">
          <StreakTable
            title="Longest winning streaks"
            rows={[...r.streaks]
              .sort((a, b) => b.longest_win_streak - a.longest_win_streak)
              .slice(0, 10)}
            kind="win"
          />
          <StreakTable
            title="Longest losing streaks"
            rows={[...r.streaks]
              .sort((a, b) => b.longest_loss_streak - a.longest_loss_streak)
              .slice(0, 10)}
            kind="loss"
          />
        </div>
      </Section>

      <Section eyebrow="Trophy Shelf" title="Championship history">
        <div className="grid md:grid-cols-3 gap-4">
          <PodiumColumn title="🥇 Champions" rows={r.champions} />
          <PodiumColumn title="🥈 Runners-up" rows={r.runners_up} />
          <PodiumColumn title="🥉 Third place" rows={r.third_place} />
        </div>
      </Section>
    </div>
  );
}

function fmtRange(rng: [[number, number], [number, number]] | null): string {
  if (!rng) return "—";
  const [a, b] = rng;
  return `${a[0]} W${a[1]} → ${b[0]} W${b[1]}`;
}

function TeamGameTable({
  rows,
  title,
}: {
  rows: import("@/lib/types").SingleTeamGame[];
  title: string;
}) {
  return (
    <div className="table-shell rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left">
          <tr>
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Team / Owner</th>
            <th className="px-3 py-2 text-right">Score</th>
            <th className="px-3 py-2">Opponent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, i) => (
              <tr key={`${g.year}-${g.week}-${g.team_id}-${i}`} className="border-t border-black/5">
              <td className="px-3 py-2 align-top"><span className="rank-medal" data-rank={i + 1}>{i + 1}</span></td>
              <td className="px-3 py-2 text-xs font-semibold text-[#766d61] align-top whitespace-nowrap">
                <Link href={`/seasons/${g.year}`} className="hover:underline">
                  {g.year} W{g.week}
                </Link>
              </td>
              <td className="px-3 py-2 align-top">
                <div className="font-bold">{g.team}</div>
                <div className="text-xs text-[#766d61]">{(g.owners ?? []).join(", ") || "—"}</div>
              </td>
              <td className="px-3 py-2 text-right font-black tabular-nums align-top">{fmt.pts(g.score)}</td>
              <td className="px-3 py-2 text-xs text-[#766d61] align-top">
                <div>vs {g.opp_team} ({fmt.pts(g.opp_score)})</div>
                <div className="text-[#9a907f]">{(g.opp_owners ?? []).join(", ")}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchupTable({
  rows,
  title,
  sortKey,
}: {
  rows: import("@/lib/types").MatchupGame[];
  title: string;
  sortKey: "margin" | "combined";
}) {
  return (
    <div className="table-shell rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left">
          <tr>
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Matchup</th>
            <th className="px-3 py-2 text-right">{sortKey === "margin" ? "Margin" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, i) => {
            const homeWon = g.home_score > g.away_score;
            const awayWon = g.away_score > g.home_score;
            return (
              <tr key={`${g.year}-${g.week}-${i}`} className="border-t border-black/5">
                <td className="px-3 py-2 align-top"><span className="rank-medal" data-rank={i + 1}>{i + 1}</span></td>
                <td className="px-3 py-2 text-xs font-semibold text-[#766d61] align-top whitespace-nowrap">
                  <Link href={`/seasons/${g.year}`} className="hover:underline">
                    {g.year} W{g.week}
                  </Link>
                </td>
                <td className="px-3 py-2 align-top">
                  <div>
                    <span className={homeWon ? "font-bold" : ""}>{g.home_team}</span>{" "}
                    <span className="text-[#766d61] tabular-nums">{fmt.pts(g.home_score)} – {fmt.pts(g.away_score)}</span>{" "}
                    <span className={awayWon ? "font-bold" : ""}>{g.away_team}</span>
                  </div>
                  <div className="text-xs text-[#766d61]">
                    {(g.home_owners ?? []).join(", ")} <span className="text-[#b9ae9d]">vs</span>{" "}
                    {(g.away_owners ?? []).join(", ")}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-black tabular-nums align-top">{fmt.pts(g[sortKey])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeasonTable({
  rows,
  title,
  col,
}: {
  rows: import("@/lib/types").SeasonTeamRow[];
  title: string;
  col: "points_for" | "ppg";
}) {
  return (
    <div className="table-shell rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left">
          <tr>
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Year</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2 text-right">Record</th>
            <th className="px-3 py-2 text-right">{col === "points_for" ? "PF" : "PPG"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={`${s.year}-${s.team_id}-${i}`} className="border-t border-black/5">
              <td className="px-3 py-2"><span className="rank-medal" data-rank={i + 1}>{i + 1}</span></td>
              <td className="px-3 py-2 text-xs font-semibold text-[#766d61]">
                <Link href={`/seasons/${s.year}`} className="hover:underline">{s.year}</Link>
              </td>
              <td className="px-3 py-2">
                <div className="font-bold">{s.team}</div>
                <div className="text-xs text-[#766d61]">{s.owner_names.join(", ")}</div>
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.record(s.wins, s.losses, s.ties)}</td>
              <td className="px-3 py-2 text-right font-black tabular-nums">{fmt.pts(s[col])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StreakTable({
  title,
  rows,
  kind,
}: {
  title: string;
  rows: import("@/lib/types").StreakRow[];
  kind: "win" | "loss";
}) {
  return (
    <div className="table-shell rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left">
          <tr>
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Owner</th>
            <th className="px-3 py-2 text-right">Streak</th>
            <th className="px-3 py-2">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const count = kind === "win" ? s.longest_win_streak : s.longest_loss_streak;
            const range = kind === "win" ? s.win_streak_range : s.loss_streak_range;
            return (
              <tr key={s.owner_id} className="border-t border-black/5">
                <td className="px-3 py-2"><span className="rank-medal" data-rank={i + 1}>{i + 1}</span></td>
                <td className="px-3 py-2 font-bold">
                  <Link href={`/teams/${encodeURIComponent(s.owner_id)}`} className="hover:underline">
                    {s.display_name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right font-black tabular-nums">{count}</td>
                <td className="px-3 py-2 text-xs font-medium text-[#766d61]">{fmtRange(range)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PodiumColumn({
  title,
  rows,
}: {
  title: string;
  rows: import("@/lib/types").SeasonTeamRow[];
}) {
  return (
    <div className="premium-panel overflow-hidden rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <ul className="divide-y divide-black/5">
        {[...rows].reverse().map((c) => (
          <li key={c.year} className="px-3 py-3 text-sm">
            <span className="badge badge-gold mr-2">{c.year}</span>
            <span className="font-black">{c.team}</span>
            <div className="mt-1 text-xs font-medium text-[#766d61]">
              {c.owner_names.join(", ")} · {fmt.record(c.wins, c.losses, c.ties)} · {fmt.pts(c.points_for)} PF
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
