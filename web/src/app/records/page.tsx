import Link from "next/link";
import { loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";
import TeamGameTable from "@/components/records/TeamGameTable";
import MatchupTable from "@/components/records/MatchupTable";
import SeasonTable from "@/components/records/SeasonTable";
import StreakTable from "@/components/records/StreakTable";
import type { SeasonTeamRow } from "@/lib/types";

export const metadata = { title: "Records — Steak Frites" };

export default function RecordsPage() {
  const r = loadRecords();

  return (
    <div className="space-y-12">
      <header className="premium-panel rounded-xl p-6">
        <div className="kicker">Archive Room</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">League Records</h1>
        <p className="mt-2 max-w-2xl text-[#6f6a60]">
          Every leaderboard worth bragging about — or hiding from. Click any column to re-sort.
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
          <TeamGameTable rows={r.highest_single_game} title="Highest" />
          <TeamGameTable rows={r.lowest_single_game} title="Lowest" defaultDir="asc" />
        </div>
      </Section>

      <Section eyebrow="Matchup Drama" title="Margin of victory" subtitle="Biggest blowouts and closest games of all time.">
        <div className="grid md:grid-cols-2 gap-4">
          <MatchupTable rows={r.biggest_blowouts} title="Biggest blowouts" valueKey="margin" />
          <MatchupTable rows={r.closest_games} title="Closest games" valueKey="margin" defaultDir="asc" />
        </div>
      </Section>

      <Section eyebrow="Totals" title="Combined scores" subtitle="Shootouts and slugfests — total points by both teams.">
        <div className="grid md:grid-cols-2 gap-4">
          <MatchupTable rows={r.highest_combined} title="Highest combined" valueKey="combined" />
          <MatchupTable rows={r.lowest_combined} title="Lowest combined" valueKey="combined" defaultDir="asc" />
        </div>
      </Section>

      <Section eyebrow="Season Marks" title="Single-season records" subtitle="Best and worst regular seasons (points for, win record).">
        <div className="grid md:grid-cols-2 gap-4">
          <SeasonTable rows={r.highest_season_pf} title="Highest PF" valueKey="points_for" />
          <SeasonTable rows={r.lowest_season_pf} title="Lowest PF" valueKey="points_for" defaultDir="asc" />
          <SeasonTable rows={r.best_season_ppg} title="Best PPG" valueKey="ppg" />
          <SeasonTable rows={r.worst_season_ppg} title="Worst PPG" valueKey="ppg" defaultDir="asc" />
        </div>
      </Section>

      <Section eyebrow="Momentum" title="Streaks" subtitle="Longest runs of consecutive wins and losses.">
        <div className="grid md:grid-cols-2 gap-4">
          <StreakTable title="Longest winning streaks" rows={r.streaks} kind="win" />
          <StreakTable title="Longest losing streaks" rows={r.streaks} kind="loss" />
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

function PodiumColumn({ title, rows }: { title: string; rows: SeasonTeamRow[] }) {
  return (
    <div className="premium-panel overflow-hidden rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">{title}</div>
      <ul className="divide-y divide-black/5">
        {[...rows].reverse().map((c) => (
          <li key={c.year} className="px-3 py-3 text-sm">
            <span className="badge badge-gold mr-2">{c.year}</span>
            <span className="font-black">{c.team}</span>
            <div className="mt-1 text-xs font-medium text-[#766d61]">
              {(c.owner_names ?? []).map((n, i) => {
                const id = c.owner_ids?.[i];
                return (
                  <span key={`${id ?? n}-${i}`}>
                    {i > 0 && ", "}
                    {id ? (
                      <Link href={`/teams/${encodeURIComponent(id)}`} className="hover:underline hover:text-[#123d35]">{n}</Link>
                    ) : n}
                  </span>
                );
              })}
              {" · "}
              {fmt.record(c.wins, c.losses, c.ties)} · {fmt.pts(c.points_for)} PF
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
