import Link from "next/link";
import { loadRecords } from "@/lib/data";
import { Section } from "@/components/Section";
import TeamGameTable from "@/components/records/TeamGameTable";
import MatchupTable from "@/components/records/MatchupTable";
import SeasonTable from "@/components/records/SeasonTable";
import StreakTable from "@/components/records/StreakTable";

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

      <Link
        href="/champions"
        className="group flex items-center justify-between gap-4 rounded-xl border border-[#123d35]/20 bg-gradient-to-r from-[#123d35] to-[#1b5a4d] px-6 py-5 text-white shadow-sm transition hover:shadow-lg hover:from-[#0e3128] hover:to-[#17483e]"
      >
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f7d77d]">Looking for the trophy shelf?</div>
          <div className="mt-1 text-xl font-black">Champions, Runners-up & Bronze →</div>
          <div className="mt-1 text-sm text-white/75">Year-by-year podium with championship counts per owner.</div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7d77d] text-2xl font-black text-[#123d35] transition group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
}
