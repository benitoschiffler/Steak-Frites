import Link from "next/link";
import { loadAdp, loadKeepers, loadMeta, loadOwners, loadSeason } from "@/lib/data";
import { Section } from "@/components/Section";
import KeeperValidator from "@/components/KeeperValidator";

export const metadata = { title: "Keepers — Steak Frites" };

export default function KeepersPage() {
  const meta = loadMeta();
  const keepers = loadKeepers();
  const adp = loadAdp();
  const owners = loadOwners();
  const currentSeason = loadSeason(meta.current_year);
  const teamCount = currentSeason.teams.length;

  // Group next-year candidates by team
  const ownerNameById = new Map(owners.map((o) => [o.owner_id, o.display_name]));
  const teamGroups = currentSeason.teams
    .map((t) => ({
      team_id: t.team_id,
      team_name: t.name,
      owners: t.owner_ids.map((id) => ownerNameById.get(id) ?? id).join(", "),
      candidates: keepers.next_year_planning.candidates.filter((c) => c.team_id === t.team_id),
    }))
    .sort((a, b) => a.team_name.localeCompare(b.team_name));

  // Current keepers (most recent completed year)
  const currentYearKeepers = keepers.keepers_by_year[String(meta.current_year)] ?? [];
  const teamById = new Map(currentSeason.teams.map((t) => [t.team_id, t]));

  // Past keepers timeline — include every season we have data for (even if no keepers
  // were recorded that year), so the gap is explicit instead of invisible.
  const allYears = meta.years.slice().sort((a, b) => b - a);
  const excludedYears = meta.excluded_record_years ?? {};

  return (
    <div className="space-y-10">
      <header className="premium-panel rounded-xl p-6">
        <div className="kicker">Keeper Desk</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Keepers</h1>
        <p className="mt-2 max-w-3xl text-[#6f6a60]">
          Track current keepers, browse historical keepers, and plan {meta.next_year} keeper choices.
        </p>
      </header>

      <Section
        title={`${meta.next_year} Keeper Planner`}
        subtitle={`Pick up to ${keepers.rules.max_total} players from your end-of-${meta.current_year} roster. The cost shown for each is the round value they would be drafted at.`}
      >
        <KeeperValidator
          teamGroups={teamGroups}
          adp={adp.players}
          rules={{
            max_total: keepers.rules.max_total,
            max_rounds_4_to_7: keepers.rules.max_rounds_4_to_7,
            max_rounds_8_to_16: keepers.rules.max_rounds_8_to_16,
          }}
          teamCount={teamCount}
          faaLastRound={keepers.rules.free_agent_round}
        />
      </Section>

      <Section title={`Current keepers (${meta.current_year})`}>
        {currentYearKeepers.length === 0 ? (
          <p className="text-sm font-medium text-[#766d61]">No keepers recorded for {meta.current_year}.</p>
        ) : (
          <div className="table-shell rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2 text-right">Kept Round</th>
                  <th className="px-3 py-2 text-right">Previous Round</th>
                  <th className="px-3 py-2 text-right">Streak</th>
                </tr>
              </thead>
              <tbody>
                {currentYearKeepers
                  .sort((a, b) => (a.kept_round_this_year ?? 0) - (b.kept_round_this_year ?? 0))
                  .map((k, i) => {
                    const team = teamById.get(k.team_id);
                    return (
                      <tr key={i} className="border-t border-black/5">
                        <td className="px-3 py-2 font-medium text-[#766d61]">{team?.name ?? `Team ${k.team_id}`}</td>
                        <td className="px-3 py-2 font-bold">{k.player_name ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-black tabular-nums">{k.kept_round_this_year ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.previous_draft_round ?? "FA"}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.consecutive_keeper_years}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Historical keepers"
        subtitle="ESPN started reliably tracking the keeper flag in 2024. Earlier seasons used keepers informally without recording them in ESPN — the years are still listed so the history is honest about its gaps."
      >
        <div className="space-y-4">
          {allYears.map((year) => {
            const list = keepers.keepers_by_year[String(year)] ?? [];
            const excluded = excludedYears[String(year)];
            const isEmpty = list.length === 0;
            return (
              <div key={year} className="premium-panel overflow-hidden rounded-lg">
                <div className="flex items-baseline justify-between border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3">
                  <Link href={`/seasons/${year}`} className="font-black hover:underline hover:text-[#123d35]">
                    {year}
                  </Link>
                  {excluded ? (
                    <span className="badge badge-gold">Sleeper season · not tracked</span>
                  ) : isEmpty ? (
                    <span className="badge text-[#766d61]">Not recorded in ESPN</span>
                  ) : (
                    <span className="badge badge-green">{list.length} keepers</span>
                  )}
                </div>
                {isEmpty ? (
                  <div className="px-3 py-4 text-sm text-[#766d61]">
                    {excluded
                      ? "League ran on Sleeper this season — ESPN has no keeper data."
                      : "No keepers flagged in ESPN. The league may have used keepers informally this year."}
                  </div>
                ) : (
                  <ul className="divide-y divide-black/5 text-sm">
                    {list
                      .sort((a, b) => (a.kept_round_this_year ?? 0) - (b.kept_round_this_year ?? 0))
                      .map((k, i) => (
                        <li key={i} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="badge badge-gold w-12 justify-center py-1">R{k.kept_round_this_year ?? "?"}</span>
                          <span className="flex-1 font-bold">{k.player_name ?? "—"}</span>
                          {k.consecutive_keeper_years > 1 && (
                            <span className="badge badge-green py-1 text-[10px]" title={`Kept ${k.consecutive_keeper_years} years in a row`}>
                              Kept {k.consecutive_keeper_years}× in a row
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
