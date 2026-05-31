import Link from "next/link";
import { notFound } from "next/navigation";
import { loadMeta, loadOwners, loadSeason } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";

export const dynamicParams = false;

export function generateStaticParams() {
  const meta = loadMeta();
  return meta.years.map((year) => ({ year: String(year) }));
}

export default async function SeasonPage(props: PageProps<"/seasons/[year]">) {
  const { year: yearStr } = await props.params;
  const year = Number(yearStr);
  const meta = loadMeta();
  if (!meta.years.includes(year)) notFound();
  const season = loadSeason(year);
  const owners = loadOwners();
  const teamById = new Map(season.teams.map((t) => [t.team_id, t]));
  const ownerNameById = new Map(owners.map((o) => [o.owner_id, o.display_name]));
  const ownerLink = (ids: string[]) =>
    ids.map((id) => ({ id, name: ownerNameById.get(id) ?? id }));

  // Standings sorted by final standing (or wins then PF)
  const standings = [...season.teams].sort((a, b) => {
    if (a.final_standing != null && b.final_standing != null) return a.final_standing - b.final_standing;
    return b.wins - a.wins || b.points_for - a.points_for;
  });

  // Group matchups by week
  const weekMap = new Map<number, typeof season.matchups>();
  for (const m of season.matchups) {
    const arr = weekMap.get(m.week) ?? [];
    arr.push(m);
    weekMap.set(m.week, arr);
  }
  const weeks = Array.from(weekMap.keys()).sort((a, b) => a - b);

  // Draft grouped by round
  const draftByRound = new Map<number, typeof season.draft>();
  for (const p of season.draft) {
    if (p.round == null) continue;
    const arr = draftByRound.get(p.round) ?? [];
    arr.push(p);
    draftByRound.set(p.round, arr);
  }

  const prevYear = meta.years.includes(year - 1) ? year - 1 : null;
  const nextYear = meta.years.includes(year + 1) ? year + 1 : null;
  const excludedNote = meta.excluded_record_years?.[String(year)];

  return (
    <div className="space-y-10">
      <header className="club-panel flex flex-col justify-between gap-6 rounded-xl p-6 md:flex-row md:items-end">
        <div>
          <div className="kicker">Season Recap</div>
          <h1 className="mt-2 text-5xl font-black tracking-tight">{year} Season</h1>
          <p className="mt-3 text-sm font-semibold text-[#f7edda]/75">
            {season.settings.team_count ?? season.teams.length} teams ·{" "}
            {season.settings.reg_season_count ?? "—"} reg-season weeks ·{" "}
            {season.settings.playoff_team_count ?? "—"}-team playoff
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          {prevYear && (
            <Link href={`/seasons/${prevYear}`} className="badge">
              ← {prevYear}
            </Link>
          )}
          {nextYear && (
            <Link href={`/seasons/${nextYear}`} className="badge">
              {nextYear} →
            </Link>
          )}
        </nav>
      </header>

      {excludedNote && (
        <div className="premium-panel overflow-hidden rounded-xl">
          <div className="flex items-stretch">
            <div className="flex w-2 shrink-0 bg-gradient-to-b from-[#c8962d] to-[#7d1d1d]" aria-hidden />
            <div className="flex-1 p-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏖️</span>
                <span className="badge badge-gold">Lost Season · {year}</span>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight">
                This season was played on Sleeper.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6a60]">
                The league migrated platforms for {year} and ESPN&apos;s record for the year is essentially
                placeholder data — incorrect champions, incorrect scores, and only partial standings. Anything
                you see below should be treated as folklore, not fact.
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#3b3328]">
                {year} is excluded from every all-time leaderboard, record, head-to-head matrix, and streak on
                this site. {excludedNote}
              </p>
            </div>
          </div>
        </div>
      )}

      <Section title="Final Standings">
        <div className="table-shell rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="px-3 py-2">Finish</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2 text-right">Record</th>
                <th className="px-3 py-2 text-right">PF</th>
                <th className="px-3 py-2 text-right">PA</th>
                <th className="px-3 py-2 text-right">Diff</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((t) => (
                <tr key={t.team_id} className="border-t border-black/5">
                  <td className="px-3 py-2 font-black">{t.final_standing != null ? fmt.ordinal(t.final_standing) : "—"}</td>
                  <td className="px-3 py-2 font-bold">{t.name}</td>
                  <td className="px-3 py-2 text-sm font-medium text-[#766d61]">
                    {ownerLink(t.owner_ids).map((o, i) => (
                      <span key={o.id}>
                        {i > 0 && ", "}
                        <Link href={`/teams/${encodeURIComponent(o.id)}`} className="hover:underline">
                          {o.name}
                        </Link>
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.record(t.wins, t.losses, t.ties)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.pts(t.points_for)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.pts(t.points_against)}</td>
                  <td className="px-3 py-2 text-right font-black tabular-nums">{fmt.pts(t.points_for - t.points_against)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Weekly Results">
        <div className="space-y-4">
          {weeks.map((week) => {
            const games = weekMap.get(week) ?? [];
            const anyPlayoff = games.some((g) => g.is_playoff);
            return (
              <div key={week} className="premium-panel overflow-hidden rounded-lg">
                <div className="flex items-baseline justify-between border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm">
                  <span className="font-black">Week {week}</span>
                  {anyPlayoff && (
                    <span className="badge badge-gold">
                      Playoffs
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-black/5">
                  {games.map((g, i) => {
                    const home = g.home_team_id != null ? teamById.get(g.home_team_id) : null;
                    const away = g.away_team_id != null ? teamById.get(g.away_team_id) : null;
                    const winnerHome = (g.home_score ?? 0) > (g.away_score ?? 0);
                    return (
                      <li key={i} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                        <div className="flex-1">
                          <span className={winnerHome ? "font-black" : "font-medium text-[#766d61]"}>{home?.name ?? "—"}</span>
                          <span className="text-[#b9ae9d]"> vs </span>
                          <span className={!winnerHome ? "font-black" : "font-medium text-[#766d61]"}>{away?.name ?? "—"}</span>
                        </div>
                        <div className="font-black tabular-nums text-right">
                          {fmt.pts(g.home_score)} – {fmt.pts(g.away_score)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      {season.draft.length > 0 && (
        <Section title="Draft Results" subtitle={`${season.draft.length} picks across ${draftByRound.size} rounds. Keeper badge marks retained players.`}>
          <div className="space-y-3">
            {Array.from(draftByRound.keys()).sort((a, b) => a - b).map((round) => {
              const picks = (draftByRound.get(round) ?? []).sort((a, b) => (a.round_pick ?? 0) - (b.round_pick ?? 0));
              return (
                <div key={round} className="premium-panel overflow-hidden rounded-lg">
                  <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
                    Round {round}
                  </div>
                  <ul className="divide-y divide-black/5">
                    {picks.map((p, i) => {
                      const team = p.team_id != null ? teamById.get(p.team_id) : null;
                      return (
                        <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <span className="w-12 text-xs font-semibold text-[#9a907f] tabular-nums">
                            {round}.{p.round_pick}
                          </span>
                          <span className="font-medium flex-1">
                            {p.player_name ?? "—"}
                            {p.keeper_status && <span className="badge badge-gold ml-2 py-1 text-[10px]">Keeper</span>}
                          </span>
                          <span className="text-xs font-medium text-[#766d61]">{team?.name ?? "—"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
