import Link from "next/link";
import { loadAllSeasons, loadMeta, loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata = { title: "Seasons — Steak Frites" };

export default function SeasonsIndex() {
  const meta = loadMeta();
  const seasons = loadAllSeasons();
  const records = loadRecords();
  const championByYear = new Map(records.champions.map((c) => [c.year, c]));
  const runnerUpByYear = new Map(records.runners_up.map((c) => [c.year, c]));

  // Sort newest first
  const ordered = [...seasons].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-8">
      <header className="premium-panel rounded-xl p-6">
        <div className="kicker">Yearbook</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Seasons</h1>
        <p className="mt-2 max-w-2xl text-[#6f6a60]">
          {meta.years[0]}-{meta.current_year}. Click any year for the full season recap.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((s) => {
          const champ = championByYear.get(s.year);
          const ru = runnerUpByYear.get(s.year);
          const topScore = Math.max(...s.matchups.map((m) => Math.max(m.home_score ?? 0, m.away_score ?? 0)));
          const excludedNote = meta.excluded_record_years?.[String(s.year)];
          return (
            <Link
              key={s.year}
              href={`/seasons/${s.year}`}
              className="premium-panel block rounded-lg p-4 transition hover:-translate-y-0.5 hover:border-[#c8962d]/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl font-black">{s.year}</div>
                <div className="flex items-center gap-2 text-xs">
                  {excludedNote && (
                    <span className="badge badge-gold">
                      Sleeper season
                    </span>
                  )}
                  <span className="badge">{s.teams.length} teams</span>
                </div>
              </div>
              <div className="mt-2 text-sm">
                {excludedNote ? (
                  <div className="text-xs font-medium text-[#766d61]">Not used for records · {excludedNote}</div>
                ) : champ ? (
                  <div>
                    <span className="badge badge-gold mr-2">Champ</span>
                    <span className="font-black">{champ.team}</span>
                  </div>
                ) : (
                  <div className="text-[#9a907f]">No champion recorded</div>
                )}
                {!excludedNote && ru && <div className="mt-2 text-xs font-semibold text-[#766d61]">Runner-up: {ru.team}</div>}
              </div>
              {!excludedNote && (
                <div className="mt-4 border-t border-black/5 pt-3 text-xs font-semibold text-[#766d61]">
                  High score this season: {fmt.pts(topScore)}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
