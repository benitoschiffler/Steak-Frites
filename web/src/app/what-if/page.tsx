import { loadMeta } from "@/lib/data";
import {
  computeWhatIfOwnerRows,
  computeWhatIfTeamRows,
  type WhatIfTeamRow,
} from "@/lib/derived";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";
import {
  WhatIfOwnersTable,
  WhatIfSeasonTable,
} from "@/components/WhatIfTables";

export const metadata = { title: "What If — Steak Frites" };

export default function WhatIfPage() {
  const meta = loadMeta();
  const teamRows = computeWhatIfTeamRows();
  const ownerRows = computeWhatIfOwnerRows().filter(
    (o) => o.actual_wins + o.actual_losses > 0,
  );

  const seasonRowsSorted = [...teamRows].sort((a, b) => a.luck_vs_pyth - b.luck_vs_pyth);
  const unluckiestSeasons = seasonRowsSorted.slice(0, 5);
  const luckiestSeasons = [...seasonRowsSorted].slice(-5).reverse();
  const currentSeasonRows = teamRows.filter((r) => r.year === meta.current_year);

  return (
    <div className="space-y-12">
      <section className="club-panel overflow-hidden rounded-xl px-6 py-7 md:px-10 md:py-10">
        <div className="kicker text-[#f7d77d]">Schedule Luck & Hypotheticals</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          What If?
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#f7edda]/75">
          Schedule strips out variance you can&apos;t control. Two ways to see
          past it: <strong>Pythagorean expected wins</strong> (what your PF/PA
          says you should&apos;ve won) and the <strong>all-play record</strong>{" "}
          (how you&apos;d have done playing every team every week). The gap
          between actual and expected is luck.
        </p>
      </section>

      <Section eyebrow="Methodology" title="What the numbers mean">
        <div className="grid gap-4 sm:grid-cols-3">
          <MethodCard
            title="Pythagorean Expected Wins"
            body="PF^2.37 ÷ (PF^2.37 + PA^2.37) × games. Scores teams by how dominant their point production was vs how much they let up — independent of who they happened to draw on the schedule."
          />
          <MethodCard
            title="All-Play Record"
            body="For each week, compare a team's score to every other team's score that week. Sum across the season. Removes opponent draw entirely — you 'play' the whole league every week."
          />
          <MethodCard
            title="Luck"
            body="Actual wins minus expected wins. A team going +2 against Pythagorean won two more games than their PF/PA would predict — schedule, narrow margins, and a touch of luck."
          />
        </div>
      </Section>

      <Section
        eyebrow="All-Time"
        title="Luck Index — by Owner"
        subtitle="Across every regular season. Defaults to most unlucky first. Click any column to sort."
      >
        <WhatIfOwnersTable rows={ownerRows} />
      </Section>

      <Section
        eyebrow="All-Time Extremes"
        title="Most Snake-Bitten Seasons"
        subtitle="Single seasons where actual wins fell furthest below what PF/PA predicted."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {unluckiestSeasons.map((r) => (
            <SeasonLuckCard key={`${r.year}-${r.team_id}`} row={r} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="All-Time Extremes"
        title="Schedule's Favorite Children"
        subtitle="Single seasons where actual wins blew past what PF/PA predicted — the timing was just right."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {luckiestSeasons.map((r) => (
            <SeasonLuckCard key={`${r.year}-${r.team_id}`} row={r} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow={`${meta.current_year} Season`}
        title="This Year's Luck Board"
        subtitle="How each team's record stacks up against what their points would predict."
      >
        <WhatIfSeasonTable rows={currentSeasonRows} />
      </Section>
    </div>
  );
}

function MethodCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="premium-panel rounded-lg p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6a22]">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#3a342a]">{body}</p>
    </div>
  );
}

function SeasonLuckCard({ row }: { row: WhatIfTeamRow }) {
  const positive = row.luck_vs_pyth > 0;
  const luckColor = positive ? "text-emerald-700" : "text-rose-700";
  const sign = row.luck_vs_pyth > 0 ? "+" : "";
  return (
    <div className="premium-panel rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="badge">{row.year}</span>
        <span className={`font-bold tabular-nums ${luckColor}`}>
          {sign}
          {row.luck_vs_pyth.toFixed(2)}
        </span>
      </div>
      <div className="mt-3 text-base font-black leading-tight">{row.team}</div>
      <div className="text-xs text-[#766d61]">{row.owner_names.join(", ")}</div>
      <div className="mt-3 text-xs text-[#5c5549]">
        Actual <span className="font-bold">{fmt.record(row.wins, row.losses, row.ties)}</span>
        <span className="mx-1 text-[#9a9085]">·</span>
        Expected <span className="font-bold">{fmt.pts(row.pyth_expected_wins)}</span> W
      </div>
      <div className="mt-1 text-xs text-[#5c5549]">
        PF {fmt.pts(row.points_for)} · PA {fmt.pts(row.points_against)}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6a22]">
        {positive ? "Lucky" : "Snake-bit"}
      </div>
    </div>
  );
}
