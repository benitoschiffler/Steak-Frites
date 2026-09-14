import Link from 'next/link';
import { loadPowerRankings } from '@/lib/data';
import { loadPublishedPowerRankings, powerRankingsSheetUrl } from '@/lib/google-power-rankings';

export const metadata = { title: 'Power Rankings — Steak Frites' };
export const revalidate = 300;

function movementLabel(movement: number | null) {
  if (movement == null) return 'NEW';
  if (movement > 0) return `▲ ${movement}`;
  if (movement < 0) return `▼ ${Math.abs(movement)}`;
  return '—';
}

export default async function PowerRankingsPage() {
  const model = loadPowerRankings();
  const rankings = await loadPublishedPowerRankings();
  const source = rankings[0]?.source ?? 'model-fallback';

  return (
    <div className="space-y-10">
      <header className="club-panel overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em]">
          <span className="text-[#f7d77d]">2026 · Week {model.week}</span>
          <span className="text-[#f7edda]/65">{model.status} · refreshes every 5 minutes</span>
        </div>
        <div className="grid gap-7 p-6 md:grid-cols-[1.35fr_.65fr] md:p-10">
          <div>
            <div className="badge badge-gold">The Tuesday Table</div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">Power Rankings</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#f7edda]/78">
              Owner-first rankings built from scoring, all-play strength, record, recent form, and floor—with a transparent editor layer for league context.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 text-sm text-[#f7edda]/75">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f7d77d]">Live publishing</div>
            <p className="mt-3 leading-6">Weekly ESPN data updates the model automatically. Commentary and bounded adjustments publish from the Google Sheet without a site deploy.</p>
            <Link href={powerRankingsSheetUrl} className="mt-4 inline-flex font-black text-[#f7d77d] hover:underline">
              Open the rankings workbook →
            </Link>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        {rankings.map((row) => (
          <article key={row.team_id} className={`premium-panel grid gap-4 rounded-xl p-5 md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:items-center ${row.featured ? 'border-[#c8962d]/60 bg-[#fff7df]' : ''}`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#123d35] text-2xl font-black text-[#f7d77d]">{row.rank}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-2xl font-black tracking-tight">{row.owner}</h2>
                <span className={`text-xs font-black ${row.movement && row.movement > 0 ? 'text-emerald-700' : row.movement && row.movement < 0 ? 'text-rose-700' : 'text-[#8a8173]'}`}>{movementLabel(row.movement)}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#8a6a22]">{row.team_name}</p>
              {row.past_team_names.length > 0 && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8a8173]">Previously: {row.past_team_names.join(' · ')}</p>
              )}
              <p className="mt-3 text-sm leading-6 text-[#5f584d]">{row.commentary}</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-black/10 pt-4 text-right md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <div><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a8173]">Record</dt><dd className="mt-1 font-black">{row.record}</dd></div>
              <div><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a8173]">PPG</dt><dd className="mt-1 font-black tabular-nums">{row.ppg.toFixed(1)}</dd></div>
              <div><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a8173]">Score</dt><dd className="mt-1 text-xl font-black tabular-nums text-[#123d35]">{row.score.toFixed(1)}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <section className="premium-panel rounded-xl p-6">
        <div className="kicker">How it works</div>
        <h2 className="mt-2 text-2xl font-black">Performance first, judgment visible</h2>
        <div className="mt-5 grid gap-4 text-sm leading-6 text-[#5f584d] md:grid-cols-3">
          <p><strong className="block text-[#17140f]">Weeks 1–2</strong>{model.methodology.early_season}</p>
          <p><strong className="block text-[#17140f]">Week 3 onward</strong>{model.methodology.standard}</p>
          <p><strong className="block text-[#17140f]">Editor layer</strong>{model.methodology.editor}</p>
        </div>
        <p className="mt-5 text-xs font-semibold text-[#8a8173]">Current source: {source === 'google-sheet' ? 'published Google Sheet' : 'committed model fallback'} · Updated {new Date(rankings[0]?.updated_at ?? model.generated_at).toLocaleString()}</p>
      </section>
    </div>
  );
}
