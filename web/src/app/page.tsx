import Link from "next/link";
import { loadMeta, loadOwners, loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import OwnerLeaderboard from "@/components/OwnerLeaderboard";
import { Section } from "@/components/Section";

export default function HomePage() {
  const meta = loadMeta();
  const records = loadRecords();
  const owners = loadOwners();

  const recentChamps = [...records.champions].reverse();
  const topBlowout = records.biggest_blowouts[0];
  const topScore = records.highest_single_game[0];
  const topSeason = records.highest_season_pf[0];
  const gamesTracked = records.owner_alltime.reduce((sum, o) => sum + o.games_played, 0) / 2;
  const activeOwners = owners.filter((o) =>
    o.appearances.some((a) => a.year === meta.current_year),
  ).length;

  // Active leaderboard = owners in the current season's league.
  const activeOwnerIds = new Set(
    owners
      .filter((o) => o.appearances.some((a) => a.year === meta.current_year))
      .map((o) => o.owner_id),
  );
  const leaderboard = records.owner_alltime.filter((o) => activeOwnerIds.has(o.owner_id));

  return (
    <div className="space-y-12">
      <section className="club-panel overflow-hidden rounded-xl">
        <div className="grid gap-8 p-6 md:grid-cols-[1.25fr_0.75fr] md:p-8">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <div className="kicker">All-Time League Archive</div>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
                Steak Frites fantasy football, preserved like a championship banner.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#f7edda]/78">
                {meta.years[0]}-{meta.current_year} standings, records, owner legacies, draft history,
                and keeper planning in one living league headquarters.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroMetric label="Seasons" value={String(meta.current_year - meta.years[0] + 1)} />
              <HeroMetric
                label="Owners"
                value={String(owners.length)}
                sub={`${activeOwners} active today`}
              />
              <HeroMetric label="Games Played" value={fmt.pts0(gamesTracked)} />
              <HeroMetric label="Champions Crowned" value={String(recentChamps.length)} />
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/8 p-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div className="badge badge-gold">Reigning Champion · {recentChamps[0]?.year ?? meta.current_year}</div>
            </div>
            <div className="mt-5 text-3xl font-black leading-tight">
              {(recentChamps[0]?.owner_names ?? []).join(" & ") || "TBD"}
            </div>
            <div className="mt-1 text-base font-semibold text-[#f7edda]/72">
              {recentChamps[0]?.team ?? "—"}
            </div>
            {recentChamps[0] && (
              <div className="mt-3 text-xs font-semibold text-[#f7edda]/70">
                {fmt.record(recentChamps[0].wins, recentChamps[0].losses, recentChamps[0].ties)} · {fmt.pts(recentChamps[0].points_for)} PF
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/12 pt-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f7d77d]">Best Season PF</div>
                <div className="mt-1 text-xl font-black tabular-nums">{fmt.pts(topSeason?.points_for)}</div>
                <div className="mt-0.5 text-[11px] text-[#f7edda]/70 line-clamp-1">
                  {topSeason?.year}: {topSeason?.team}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f7d77d]">Biggest Blowout</div>
                <div className="mt-1 text-xl font-black tabular-nums">{fmt.pts(topBlowout?.margin)}</div>
                <div className="mt-0.5 text-[11px] text-[#f7edda]/70 line-clamp-1">
                  {topBlowout?.year} W{topBlowout?.week}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FactCard
          label="Most Recent Champ"
          value={recentChamps[0]?.team ?? "—"}
          sub={`${recentChamps[0]?.year ?? ""} · ${(recentChamps[0]?.owner_names ?? []).join(", ")}`}
        />
        <FactCard
          label="Biggest Blowout"
          value={`${fmt.pts(topBlowout?.margin)} pts`}
          sub={`${topBlowout?.year} W${topBlowout?.week}: ${topBlowout?.home_team} vs ${topBlowout?.away_team}`}
        />
        <FactCard
          label="Highest Single Game"
          value={fmt.pts(topScore?.score)}
          sub={`${topScore?.year} W${topScore?.week}: ${topScore?.team}`}
        />
        <FactCard
          label="Best Season (PF)"
          value={fmt.pts(topSeason?.points_for)}
          sub={`${topSeason?.year}: ${topSeason?.team}`}
        />
      </section>

      <Section
        eyebrow="Current Field"
        title="Active Owner Leaderboard"
        subtitle={`Owners in the ${meta.current_year} league. Click any column to sort and compare all-time performance.`}
      >
        <OwnerLeaderboard
          rows={leaderboard}
          columns={[
            "owner",
            "record",
            "win_pct",
            "points_for",
            "points_against",
            "ppg",
            "championships",
            "runner_ups",
            "third_place_finishes",
            "playoff_appearances",
            "seasons",
          ]}
          defaultSort={{ key: "win_pct", dir: "desc" }}
        />
        <Link
          href="/teams"
          className="group mt-6 flex items-center justify-between gap-4 rounded-xl border border-[#123d35]/20 bg-gradient-to-r from-[#123d35] to-[#1b5a4d] px-6 py-5 text-white shadow-sm transition hover:shadow-lg hover:from-[#0e3128] hover:to-[#17483e]"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f7d77d]">
              Open the archive
            </div>
            <div className="mt-1 text-xl font-black">All-Time Owner Leaderboard</div>
            <div className="mt-1 text-sm text-white/75">
              Every owner since {meta.years[0]} — active, alumni, co-owners, championships, the works.
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7d77d] text-2xl font-black text-[#123d35] transition group-hover:translate-x-1">
            →
          </div>
        </Link>
      </Section>

      <Section eyebrow="Hall of Champions" title="Champions Roll">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentChamps.map((c) => (
            <div key={c.year} className="premium-panel rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="badge badge-gold">{c.year}</div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a22]">Champion</div>
              </div>
              <div className="mt-4 text-lg font-black">{c.team}</div>
              <div className="text-sm font-medium text-[#6f6a60]">{c.owner_names.join(", ")}</div>
              <div className="mt-3 text-xs font-semibold text-[#8a8173]">
                {fmt.record(c.wins, c.losses, c.ties)} · {fmt.pts(c.points_for)} PF
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function FactCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat-card rounded-lg p-4">
      <div className="kicker">{label}</div>
      <div className="mt-3 text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-[#766d61]">{sub}</div>
    </div>
  );
}

function HeroMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/8 p-3">
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f7d77d]">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] font-semibold text-[#f7edda]/70">{sub}</div>}
    </div>
  );
}
