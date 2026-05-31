import { loadMeta, loadOwners, loadRecords } from "@/lib/data";
import OwnerLeaderboard from "@/components/OwnerLeaderboard";

export const metadata = { title: "Owners — Steak Frites" };

export default function OwnersIndex() {
  const meta = loadMeta();
  const owners = loadOwners();
  const records = loadRecords();
  const activeIds = owners
    .filter((o) => o.appearances.some((a) => a.year === meta.current_year))
    .map((o) => o.owner_id);
  const coOwnerNamesById = Object.fromEntries(
    owners
      .filter((o) => o.co_owner_names.length > 0)
      .map((o) => [o.owner_id, o.co_owner_names]),
  );

  return (
    <div className="space-y-8">
      <header className="premium-panel rounded-xl p-6">
        <div className="kicker">Owner Legacy Index</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">All-Time Leaderboard</h1>
        <p className="mt-2 max-w-3xl text-[#6f6a60]">
          All {owners.length} owners across {meta.years[0]}-{meta.current_year}. Active badges mark owners in {meta.current_year}. Click any column to sort.
        </p>
        {Object.keys(meta.excluded_record_years ?? {}).length > 0 && (
          <p className="mt-3 text-xs font-semibold text-[#766d61]">
            Stats exclude {Object.keys(meta.excluded_record_years).join(", ")} (Sleeper season).
          </p>
        )}
      </header>

      <OwnerLeaderboard
        rows={records.owner_alltime}
        columns={[
          "owner",
          "seasons",
          "record",
          "win_pct",
          "points_for",
          "points_against",
          "ppg",
          "championships",
          "runner_ups",
          "third_place_finishes",
          "playoff_appearances",
        ]}
        defaultSort={{ key: "win_pct", dir: "desc" }}
        activeOwnerIds={activeIds}
        coOwnerNamesById={coOwnerNamesById}
      />
    </div>
  );
}
