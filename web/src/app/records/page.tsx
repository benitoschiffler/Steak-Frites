import Link from "next/link";
import { loadMeta, loadPlayers, loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";
import TeamGameTable from "@/components/records/TeamGameTable";
import MatchupTable from "@/components/records/MatchupTable";
import SeasonTable from "@/components/records/SeasonTable";
import StreakTable from "@/components/records/StreakTable";
import PlayerRecordTable from "@/components/records/PlayerRecordTable";

export const metadata = { title: "Records — Steak Frites" };

export default function RecordsPage() {
  const r = loadRecords();
  const players = loadPlayers();
  const meta = loadMeta();
  const currentYear = meta.current_year;
  const openingTeam = r.opening_week_highest.find((row) => row.year === currentYear);
  const openingTeamRank = openingTeam
    ? r.opening_week_highest.findIndex(
        (row) => row.year === openingTeam.year && row.team_id === openingTeam.team_id,
      ) + 1
    : null;
  const openingPlayer = players.opening_week_top.find((row) => row.year === currentYear);
  const openingPlayerRank = openingPlayer
    ? players.opening_week_top.findIndex(
        (row) =>
          row.year === openingPlayer.year &&
          row.player_id === openingPlayer.player_id &&
          row.team_id === openingPlayer.team_id,
      ) + 1
    : null;
  const openingHeartbreak = r.highest_losing_scores.find(
    (row) => row.year === currentYear && row.week === 1,
  );

  return (
    <div className="space-y-12">
      <header className="club-panel overflow-hidden rounded-xl">
        <div className="border-b border-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#f7d77d]">
          {currentYear} opening-week record watch
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1.25fr_.75fr] md:p-10">
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">The Record Book</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#f7edda]/78">
              The scores people remember, the losses nobody lives down, and the NFL players who detonated a fantasy week.
            </p>
            {openingTeam && (
              <div className="mt-8 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div className="text-6xl font-black tabular-nums text-[#f7d77d]">{fmt.pts(openingTeam.score)}</div>
                <div className="pb-1">
                  <div className="text-lg font-black">{openingTeam.owners.join(" & ")}</div>
                  <div className="text-sm text-[#f7edda]/68">{openingTeam.team} · best score of {currentYear} Week 1</div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4 border-white/10 md:border-l md:pl-7">
            {openingTeam && openingTeamRank && (
              <RecordCallout
                label="League-history rank"
                value={`#${openingTeamRank}`}
                detail={`among opening-week team scores since ${meta.years[0]}`}
              />
            )}
            {openingPlayer && openingPlayerRank && (
              <RecordCallout
                label="Week 1 player leader"
                value={`${openingPlayer.player_name} · ${fmt.pts(openingPlayer.points)}`}
                detail={`#${openingPlayerRank} opening-week starter since ${players.coverage.first_year_with_box_scores}`}
              />
            )}
            {openingHeartbreak && (
              <RecordCallout
                label="Week 1 heartbreak"
                value={`${openingHeartbreak.owners.join(" & ")} · ${fmt.pts(openingHeartbreak.score)}`}
                detail={`lost to ${openingHeartbreak.opp_owners.join(" & ")}, ${fmt.pts(openingHeartbreak.opp_score)}–${fmt.pts(openingHeartbreak.score)}`}
              />
            )}
          </div>
        </div>
        {Object.keys(r.excluded_years).length > 0 && (
          <div className="border-t border-white/10 bg-white/[0.04] px-6 py-3 text-xs font-medium text-[#f7edda]/68">
            <strong>Note:</strong> Records do not include{" "}
            {Object.entries(r.excluded_years)
              .map(([y, note]) => `${y} (${note})`)
              .join("; ")}
          </div>
        )}
      </header>

      <Section
        eyebrow="Opening Bell"
        title="Week 1 royalty"
        subtitle="The hottest starts in league history—fantasy teams from 2016 onward and starting NFL players from 2019 onward."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamGameTable rows={r.opening_week_highest} title="Highest opening-week team scores" />
          <PlayerRecordTable rows={players.opening_week_top} title="Highest opening-week player scores" />
        </div>
      </Section>

      <Section
        eyebrow="Pain & Fortune"
        title="Heartbreak and ugly wins"
        subtitle="The most points ever scored in a loss, and the fewest points anyone got away with in a win."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamGameTable rows={r.highest_losing_scores} title="Highest scores in a loss" />
          <TeamGameTable rows={r.lowest_winning_scores} title="Lowest scores in a win" defaultDir="asc" />
        </div>
      </Section>

      <Section
        eyebrow="Player Chaos"
        title="Bench nightmares and carry jobs"
        subtitle="The eruptions stranded on the bench, and the starters who supplied the biggest share of an entire team score."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerRecordTable rows={players.biggest_bench_scores} title="Most points left on the bench" />
          <PlayerRecordTable rows={players.biggest_carry_jobs} title="Biggest one-player carry jobs" metric="share" />
        </div>
      </Section>

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

function RecordCallout({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f7d77d]">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[#f7edda]/65">{detail}</div>
    </div>
  );
}
