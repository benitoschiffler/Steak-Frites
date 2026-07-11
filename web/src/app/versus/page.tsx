import { VersusExplorer } from "@/components/VersusExplorer";
import { loadAllSeasons, loadMeta, loadOwners } from "@/lib/data";
import { buildVersusRecords } from "@/lib/versus";

export const metadata = { title: "Versus — Steak Frites" };

export default function VersusPage() {
  const meta = loadMeta();
  const owners = loadOwners();
  const activeIds = new Set(owners.filter((owner) => owner.appearances.some((appearance) => appearance.year === meta.current_year)).map((owner) => owner.owner_id));
  const ownerOptions = owners.map((owner) => ({ id: owner.owner_id, name: owner.display_name, active: activeIds.has(owner.owner_id) })).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  const records = buildVersusRecords(loadAllSeasons(), owners, new Set(Object.keys(meta.excluded_record_years ?? {}).map(Number)));
  const initialOwnerId = ownerOptions.find((owner) => owner.name === "Bennett Schiff")?.id ?? ownerOptions[0]?.id ?? "";
  const initialOpponentId = ownerOptions.find((owner) => owner.id !== initialOwnerId && owner.active)?.id ?? ownerOptions[1]?.id ?? "";
  return <div className="space-y-8"><header className="premium-panel rounded-xl p-6"><div className="kicker">Head-to-head archive</div><h1 className="mt-2 text-4xl font-black tracking-tight">Versus</h1><p className="mt-2 max-w-3xl text-[#6f6a60]">Settle the argument with every recorded meeting, series score, biggest blowout, closest finish and playoff result. {Object.keys(meta.excluded_record_years ?? {}).length ? "The non-authoritative Sleeper season is excluded." : ""}</p></header><VersusExplorer owners={ownerOptions} records={records} initialOwnerId={initialOwnerId} initialOpponentId={initialOpponentId} /></div>;
}
