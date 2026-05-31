import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAllSeasons, loadKeepers, loadMeta, loadOwners, loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";

export const dynamicParams = false;

export function generateStaticParams() {
  const owners = loadOwners();
  return owners.map((o) => ({ ownerId: o.owner_id }));
}

export default async function OwnerPage(props: PageProps<"/teams/[ownerId]">) {
  const { ownerId: raw } = await props.params;
  const ownerId = decodeURIComponent(raw);
  const owners = loadOwners();
  const owner = owners.find((o) => o.owner_id === ownerId);
  if (!owner) notFound();

  const meta = loadMeta();
  const records = loadRecords();
  const allTime = records.owner_alltime.find((o) => o.owner_id === ownerId);
  const keepers = loadKeepers();
  const seasons = loadAllSeasons();

  // Per-season appearances with team info enriched
  const appearances = [...owner.appearances].sort((a, b) => b.year - a.year);

  // All keepers historically attributed to this owner's teams (per year)
  const ownerKeepers: { year: number; team: string; player_name: string | null; round: number | null; streak: number }[] = [];
  for (const [yearStr, ks] of Object.entries(keepers.keepers_by_year)) {
    const year = Number(yearStr);
    const season = seasons.find((s) => s.year === year);
    if (!season) continue;
    for (const k of ks) {
      const team = season.teams.find((t) => t.team_id === k.team_id);
      if (!team) continue;
      if (!team.owner_ids.includes(ownerId)) continue;
      ownerKeepers.push({
        year,
        team: team.name,
        player_name: k.player_name,
        round: k.kept_round_this_year,
        streak: k.consecutive_keeper_years,
      });
    }
  }
  ownerKeepers.sort((a, b) => b.year - a.year);

  // Head-to-head vs other owners
  const h2hRows = records.head_to_head.filter((row) => row.owner_a === ownerId);
  const ownerNames = new Map(owners.map((o) => [o.owner_id, o.display_name]));
  h2hRows.sort((a, b) => (b.wins + b.losses + b.ties) - (a.wins + a.losses + a.ties));

  // Draft history across owner's teams
  const draftRows: { year: number; round: number | null; round_pick: number | null; team: string; player: string | null; keeper: boolean }[] = [];
  for (const s of seasons) {
    const teamIds = s.teams.filter((t) => t.owner_ids.includes(ownerId)).map((t) => t.team_id);
    if (teamIds.length === 0) continue;
    for (const p of s.draft) {
      if (p.team_id == null || !teamIds.includes(p.team_id)) continue;
      const team = s.teams.find((t) => t.team_id === p.team_id);
      draftRows.push({
        year: s.year,
        round: p.round,
        round_pick: p.round_pick,
        team: team?.name ?? "—",
        player: p.player_name,
        keeper: p.keeper_status,
      });
    }
  }
  draftRows.sort((a, b) => b.year - a.year || (a.round ?? 0) - (b.round ?? 0));

  return (
    <div className="space-y-10">
      <header className="club-panel rounded-xl p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-2xl font-black text-[#f7d77d]">
            {initials(owner.display_name)}
          </div>
          <div>
            <div className="kicker">Owner Profile</div>
            <h1 className="mt-2 text-5xl font-black tracking-tight">{owner.display_name}</h1>
          </div>
        </div>
        {owner.co_owner_names.length > 0 && (
          <p className="mt-4 text-sm font-semibold text-[#f7edda]/75">
            Co-owner{owner.co_owner_names.length > 1 ? "s" : ""}: {owner.co_owner_names.join(", ")}
          </p>
        )}
        {owner.aliases.length > 1 && (
          <p className="mt-1 text-xs font-medium text-[#f7edda]/55">
            Also listed as: {owner.aliases.filter((a) => a !== owner.display_name).join(", ")}
          </p>
        )}
      </header>

      {allTime && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Record" value={fmt.record(allTime.wins, allTime.losses, allTime.ties)} sub={`${fmt.pct(allTime.win_pct)} win rate`} />
            <Stat label="Total PF" value={fmt.pts(allTime.points_for)} sub={`${fmt.pts(allTime.ppg)} per game`} />
            <Stat label="Championships" value={String(allTime.championships)} sub={`${allTime.runner_ups} runner-up · ${allTime.third_place_finishes} third place`} />
            <Stat label="Best / Worst Finish" value={`${allTime.best_finish != null ? fmt.ordinal(allTime.best_finish) : "—"} / ${allTime.worst_finish != null ? fmt.ordinal(allTime.worst_finish) : "—"}`} sub={`${allTime.playoff_appearances}/${allTime.seasons} playoff seasons`} />
          </section>
          {Object.keys(meta.excluded_record_years ?? {}).length > 0 && (
            <p className="text-xs font-semibold text-[#766d61]">
              All-time stats exclude {Object.keys(meta.excluded_record_years).join(", ")} (Sleeper season).
            </p>
          )}
        </>
      )}

      <Section title="Season-by-season">
        <div className="table-shell rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2 text-right">Record</th>
                <th className="px-3 py-2 text-right">PF</th>
                <th className="px-3 py-2 text-right">Finish</th>
              </tr>
            </thead>
            <tbody>
              {appearances.map((a) => {
                const excluded = meta.excluded_record_years?.[String(a.year)];
                return (
                  <tr key={`${a.year}-${a.team_id}`} className={`border-t border-black/5 ${excluded ? "text-[#9a907f]" : ""}`}>
                    <td className="px-3 py-2">
                      <Link href={`/seasons/${a.year}`} className="hover:underline">{a.year}</Link>
                      {excluded && (
                        <span className="badge badge-gold ml-2 py-1 text-[10px]">Sleeper</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold">{a.team_name}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.record(a.wins, a.losses, a.ties)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.pts(a.points_for)}</td>
                    <td className="px-3 py-2 text-right font-black tabular-nums">
                      {a.final_standing != null ? fmt.ordinal(a.final_standing) : "—"}
                      {!excluded && a.final_standing === 1 && <span className="badge badge-gold ml-2 py-1 text-[10px]">Champ</span>}
                      {!excluded && a.final_standing === 2 && <span className="badge ml-2 py-1 text-[10px]">Runner-up</span>}
                      {!excluded && a.final_standing === 3 && <span className="badge ml-2 py-1 text-[10px]">Third</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {ownerKeepers.length > 0 && (
        <Section title="Keeper history">
          <div className="table-shell rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2 text-right">Kept Round</th>
                  <th className="px-3 py-2 text-right">Streak</th>
                </tr>
              </thead>
              <tbody>
                {ownerKeepers.map((k, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-3 py-2">{k.year}</td>
                    <td className="px-3 py-2 font-medium text-[#766d61]">{k.team}</td>
                    <td className="px-3 py-2 font-bold">{k.player_name ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.round ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-black tabular-nums">{k.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {h2hRows.length > 0 && (
        <Section title="Head-to-head" subtitle="All-time matchup record vs every other owner.">
          <div className="table-shell rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="px-3 py-2">Opponent</th>
                  <th className="px-3 py-2 text-right">Record</th>
                  <th className="px-3 py-2 text-right">PF</th>
                  <th className="px-3 py-2 text-right">PA</th>
                </tr>
              </thead>
              <tbody>
                {h2hRows.map((row) => (
                  <tr key={row.owner_b} className="border-t border-black/5">
                    <td className="px-3 py-2 font-bold">
                      <Link href={`/teams/${encodeURIComponent(row.owner_b)}`} className="hover:underline">
                        {ownerNames.get(row.owner_b) ?? row.owner_b}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-black tabular-nums">{fmt.record(row.wins, row.losses, row.ties)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.pts(row.points_for)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.pts(row.points_against)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Draft history" subtitle="Every pick made by this owner's teams. Keeper badge marks retained players.">
        <details className="premium-panel overflow-hidden rounded-lg">
          <summary className="cursor-pointer bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
            {draftRows.length} picks across {appearances.length} seasons (click to expand)
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Pick</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Team</th>
                </tr>
              </thead>
              <tbody>
                {draftRows.map((d, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-3 py-2 font-medium text-[#766d61]">{d.year}</td>
                    <td className="px-3 py-2 font-medium text-[#766d61] tabular-nums">{d.round}.{d.round_pick}</td>
                    <td className="px-3 py-2 font-medium">
                      {d.player ?? "—"} {d.keeper && <span className="badge badge-gold ml-2 py-1 text-[10px]">Keeper</span>}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-[#766d61]">{d.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card rounded-lg p-4">
      <div className="kicker">{label}</div>
      <div className="mt-2 text-2xl font-black tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-xs font-semibold text-[#766d61]">{sub}</div>}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
