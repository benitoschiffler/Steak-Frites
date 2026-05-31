import Link from "next/link";
import { loadMeta, loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";
import type { SeasonTeamRow } from "@/lib/types";

export const metadata = { title: "Trophy Shelf — Steak Frites" };

export default function ChampionsPage() {
  const meta = loadMeta();
  const r = loadRecords();

  // Build a year -> {champ, runnerUp, third} map for the timeline view
  const byYear = new Map<number, { champ?: SeasonTeamRow; ru?: SeasonTeamRow; third?: SeasonTeamRow }>();
  for (const c of r.champions) {
    const entry = byYear.get(c.year) ?? {};
    entry.champ = c;
    byYear.set(c.year, entry);
  }
  for (const c of r.runners_up) {
    const entry = byYear.get(c.year) ?? {};
    entry.ru = c;
    byYear.set(c.year, entry);
  }
  for (const c of r.third_place) {
    const entry = byYear.get(c.year) ?? {};
    entry.third = c;
    byYear.set(c.year, entry);
  }
  const orderedYears = [...byYear.keys()].sort((a, b) => b - a);

  // Per-owner titles tally (champs)
  const titleCounts = new Map<string, { name: string; ownerId?: string; titles: SeasonTeamRow[] }>();
  for (const c of r.champions) {
    (c.owner_ids ?? []).forEach((id, i) => {
      const name = c.owner_names?.[i] ?? id;
      const key = id ?? name;
      const rec = titleCounts.get(key) ?? { name, ownerId: id, titles: [] };
      rec.titles.push(c);
      titleCounts.set(key, rec);
    });
  }
  const champLeaders = [...titleCounts.values()].sort((a, b) => b.titles.length - a.titles.length);

  return (
    <div className="space-y-10">
      <header className="club-panel overflow-hidden rounded-xl">
        <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="text-[#f7d77d]">Trophy Shelf · {meta.years[0]}–{meta.current_year}</span>
          <span className="text-[#f7edda]/65">{r.champions.length} champions crowned</span>
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="text-3xl leading-none">🏆</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Champions, Runners-up & Bronze</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium text-[#f7edda]/75">
            Every Steak Frites podium since {meta.years[0]}. Click a year for the full season
            recap, or an owner for their full résumé.
          </p>
        </div>
      </header>

      {/* Title leaders */}
      <Section eyebrow="Most Titles" title="Owners by championships">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {champLeaders.map(({ name, ownerId, titles }) => (
            <div key={ownerId ?? name} className="premium-panel rounded-lg p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black tabular-nums">{titles.length}</div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a22]">
                  {titles.length === 1 ? "Title" : "Titles"}
                </div>
              </div>
              <div className="mt-2 text-base font-black">
                {ownerId ? (
                  <Link href={`/teams/${encodeURIComponent(ownerId)}`} className="hover:underline hover:text-[#123d35]">
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </div>
              <div className="mt-1 text-xs font-medium text-[#766d61]">
                {titles
                  .sort((a, b) => a.year - b.year)
                  .map((t) => t.year)
                  .join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Year-by-year podium timeline */}
      <Section eyebrow="Year by Year" title="Podium history">
        <div className="space-y-4">
          {orderedYears.map((year) => {
            const { champ, ru, third } = byYear.get(year) ?? {};
            return (
              <div key={year} className="premium-panel overflow-hidden rounded-lg">
                <div className="flex items-baseline justify-between border-b border-black/10 bg-[#123d35]/[0.06] px-4 py-3">
                  <Link href={`/seasons/${year}`} className="text-lg font-black hover:text-[#123d35] hover:underline">
                    {year}
                  </Link>
                  {champ && (
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a22]">
                      Season recap →
                    </span>
                  )}
                </div>
                <div className="grid gap-0 sm:grid-cols-3">
                  <PodiumCell place={1} row={champ} />
                  <PodiumCell place={2} row={ru} />
                  <PodiumCell place={3} row={third} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Stacked podiums (table form) */}
      <Section eyebrow="Full Tally" title="Champions, Runners-up & Third by year">
        <div className="grid gap-4 md:grid-cols-3">
          <PodiumColumn title="🥇 Champions" rows={r.champions} accent="gold" />
          <PodiumColumn title="🥈 Runners-up" rows={r.runners_up} accent="silver" />
          <PodiumColumn title="🥉 Third place" rows={r.third_place} accent="bronze" />
        </div>
      </Section>
    </div>
  );
}

function PodiumCell({ place, row }: { place: 1 | 2 | 3; row?: SeasonTeamRow }) {
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  const label = place === 1 ? "Champion" : place === 2 ? "Runner-up" : "Third";
  return (
    <div className={`flex flex-col gap-1 p-4 ${place !== 3 ? "sm:border-r border-black/5" : ""}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a22]">
        <span className="text-base">{medal}</span>
        {label}
      </div>
      {row ? (
        <>
          <div className="text-lg font-black">{row.team}</div>
          <div className="text-sm font-medium text-[#5c5549]">
            {(row.owner_names ?? []).map((n, i) => {
              const id = row.owner_ids?.[i];
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
          </div>
          <div className="text-xs font-semibold text-[#8a8173]">
            {fmt.record(row.wins, row.losses, row.ties)} · {fmt.pts(row.points_for)} PF
          </div>
        </>
      ) : (
        <div className="text-sm font-medium text-[#9a907f]">—</div>
      )}
    </div>
  );
}

function PodiumColumn({
  title,
  rows,
  accent: _accent,
}: {
  title: string;
  rows: SeasonTeamRow[];
  accent: "gold" | "silver" | "bronze";
}) {
  return (
    <div className="premium-panel overflow-hidden rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">{title}</div>
      <ul className="divide-y divide-black/5">
        {[...rows].sort((a, b) => b.year - a.year).map((c) => (
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
                      <Link href={`/teams/${encodeURIComponent(id)}`} className="hover:underline hover:text-[#123d35]">
                        {n}
                      </Link>
                    ) : (
                      n
                    )}
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
