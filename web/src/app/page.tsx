import Link from "next/link";
import { loadMeta, loadOwners, loadRecords } from "@/lib/data";
import { fmt } from "@/lib/format";
import OwnerLeaderboard from "@/components/OwnerLeaderboard";
import { Section } from "@/components/Section";

export default function HomePage() {
  const meta = loadMeta();
  const records = loadRecords();
  const owners = loadOwners();

  const champs = [...records.champions].sort((a, b) => b.year - a.year);
  const reigning = champs[0];
  const topBlowout = records.biggest_blowouts[0];
  const topScore = records.highest_single_game[0];
  const topSeason = records.highest_season_pf[0];
  const longestWin = [...records.streaks].sort(
    (a, b) => b.longest_win_streak - a.longest_win_streak,
  )[0];
  const gamesTracked =
    records.owner_alltime.reduce((sum, o) => sum + o.games_played, 0) / 2;
  const seasons = meta.current_year - meta.years[0] + 1;

  const activeOwnerIds = new Set(
    owners
      .filter((o) => o.appearances.some((a) => a.year === meta.current_year))
      .map((o) => o.owner_id),
  );
  const activeOwners = activeOwnerIds.size;
  const leaderboard = records.owner_alltime.filter((o) =>
    activeOwnerIds.has(o.owner_id),
  );

  return (
    <div className="space-y-12">
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="club-panel overflow-hidden rounded-xl">
        {/* Thin masthead strip */}
        <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="text-[#f7d77d]">
            The Steak Frites League · Est. {meta.years[0]}
          </span>
          <span className="text-[#f7edda]/65">
            Volume {seasons} · {meta.years[0]}–{meta.current_year}
          </span>
        </div>

        {/* Main split: champion spotlight | league vitals */}
        <div className="grid gap-0 md:grid-cols-[1.3fr_1fr]">
          {/* Left: champion */}
          <div className="flex flex-col gap-6 p-6 md:gap-8 md:border-r md:border-white/10 md:p-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl leading-none">🏆</span>
                <span className="badge badge-gold">
                  Reigning Champion · {reigning?.year ?? meta.current_year}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
                {(reigning?.owner_names ?? []).join(" & ") || "TBD"}
              </h1>
              <div className="mt-2 text-lg font-semibold text-[#f7edda]/80">
                &ldquo;{reigning?.team ?? "—"}&rdquo;
              </div>
            </div>
            {reigning && (
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4">
                <ChampStat
                  label="Regular Season"
                  value={fmt.record(reigning.wins, reigning.losses, reigning.ties)}
                />
                <ChampStat label="Points For" value={fmt.pts(reigning.points_for)} />
                <ChampStat
                  label="Champion #"
                  value={`${champs.length} of ${champs.length}`}
                  sub={`${champs.length}th title in ${seasons} seasons`}
                />
              </div>
            )}
            <Link
              href={`/seasons/${reigning?.year ?? meta.current_year}`}
              className="group inline-flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#f7d77d] transition hover:text-[#f8e7a9]"
            >
              Read the {reigning?.year ?? meta.current_year} recap
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>

          {/* Right: league vitals */}
          <div className="flex flex-col gap-6 bg-gradient-to-br from-white/[0.045] to-transparent p-6 md:p-10">
            <div>
              <div className="kicker text-[#f7d77d]">League at a Glance</div>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6">
                <VitalsStat n={seasons} label="Seasons" />
                <VitalsStat
                  n={owners.length}
                  label="Owners"
                  sub={`${activeOwners} active`}
                />
                <VitalsStat n={champs.length} label="Champions" />
                <VitalsStat n={fmt.pts0(gamesTracked)} label="Games" />
              </div>
            </div>
            <div className="mt-auto border-t border-white/10 pt-5 text-sm font-medium leading-6 text-[#f7edda]/72">
              Ten seasons of standings, records, owner legacies, draft history,
              and keeper planning — in one living league headquarters.
            </div>
          </div>
        </div>
      </section>

      {/* ── ALL-TIME LEADERBOARD CTA (promoted from below) ─────────────── */}
      <Link
        href="/teams"
        className="group flex flex-col gap-4 rounded-xl border border-[#123d35]/20 bg-gradient-to-r from-[#123d35] to-[#1b5a4d] p-6 text-white shadow-sm transition hover:shadow-lg hover:from-[#0e3128] hover:to-[#17483e] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-7"
      >
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f7d77d]">
            Open the archive
          </div>
          <div className="mt-2 text-2xl font-black md:text-3xl">
            All-Time Owner Leaderboard
          </div>
          <div className="mt-2 max-w-2xl text-sm text-white/75">
            Every owner since {meta.years[0]} — active, alumni, co-owners,
            championships, points for, points against, the works. Click any
            column to sort.
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#f7d77d] sm:inline">
            Explore
          </span>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f7d77d] text-2xl font-black text-[#123d35] transition group-hover:translate-x-1">
            →
          </span>
        </div>
      </Link>

      {/* ── ACTIVE OWNER LEADERBOARD ───────────────────────────────────── */}
      <Section
        eyebrow="Current Field"
        title="Active Owner Leaderboard"
        subtitle={`Owners in the ${meta.current_year} league. Click any column to sort.`}
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
      </Section>

      {/* ── RECORDS SNAPSHOT (moved down + repurposed) ─────────────────── */}
      <Section
        eyebrow="Hall of Records"
        title="Records at a Glance"
        subtitle="A handful of the moments that made the archive. Tap any tile to see the full leaderboard."
      >
        <div className="mb-4 flex justify-end">
          <Link
            href="/records"
            className="badge group inline-flex items-center gap-1 hover:border-[#123d35]/30 hover:text-[#123d35]"
          >
            See every record
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FactCard
            href="/records"
            icon="💥"
            label="Biggest Blowout"
            value={`${fmt.pts(topBlowout?.margin)}`}
            unit="pt margin"
            sub={`${topBlowout?.year} W${topBlowout?.week} · ${topBlowout?.home_team} vs ${topBlowout?.away_team}`}
          />
          <FactCard
            href="/records"
            icon="🔥"
            label="Highest Single Game"
            value={fmt.pts(topScore?.score)}
            unit="points"
            sub={`${topScore?.year} W${topScore?.week} · ${topScore?.team}`}
          />
          <FactCard
            href="/records"
            icon="📈"
            label="Best Season (PF)"
            value={fmt.pts(topSeason?.points_for)}
            unit="total"
            sub={`${topSeason?.year} · ${topSeason?.team}`}
          />
          <FactCard
            href="/records"
            icon="🚀"
            label="Longest Win Streak"
            value={String(longestWin?.longest_win_streak ?? "—")}
            unit="straight wins"
            sub={
              longestWin
                ? `${longestWin.display_name} · ${longestWin.win_streak_range?.[0]?.[0]} W${longestWin.win_streak_range?.[0]?.[1]} → ${longestWin.win_streak_range?.[1]?.[0]} W${longestWin.win_streak_range?.[1]?.[1]}`
                : ""
            }
          />
        </div>
      </Section>

      {/* ── CHAMPIONS ROLL ─────────────────────────────────────────────── */}
      <Section eyebrow="Trophy Shelf" title="Champions Roll">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {champs.map((c) => (
            <div key={c.year} className="premium-panel rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="badge badge-gold">{c.year}</div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a22]">
                  Champion
                </div>
              </div>
              <div className="mt-4 text-lg font-black">{c.team}</div>
              <div className="text-sm font-medium text-[#6f6a60]">
                {c.owner_names.join(", ")}
              </div>
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

function ChampStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f7d77d]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
      {sub && (
        <div className="mt-0.5 text-[11px] font-semibold text-[#f7edda]/65">{sub}</div>
      )}
    </div>
  );
}

function VitalsStat({
  n,
  label,
  sub,
}: {
  n: number | string;
  label: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-3xl font-black leading-none tabular-nums">{n}</div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f7d77d]">
        {label}
      </div>
      {sub && (
        <div className="text-[11px] font-semibold text-[#f7edda]/65">{sub}</div>
      )}
    </div>
  );
}

function FactCard({
  href,
  icon,
  label,
  value,
  unit,
  sub,
}: {
  href: string;
  icon: string;
  label: string;
  value: string;
  unit?: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="stat-card group flex flex-col rounded-lg p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl leading-none">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6a22] transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <div className="mt-4 kicker">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-black tabular-nums tracking-tight">
          {value}
        </div>
        {unit && (
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#766d61]">
            {unit}
          </span>
        )}
      </div>
      <div className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-[#766d61]">
        {sub}
      </div>
    </Link>
  );
}
