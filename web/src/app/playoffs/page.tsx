import { loadMeta, loadPlayers } from "@/lib/data";
import {
  computeFinalsHistory,
  computePlayoffOwnerRows,
} from "@/lib/derived";
import { fmt } from "@/lib/format";
import { Section } from "@/components/Section";
import PlayoffOwnersTable from "@/components/PlayoffOwnersTable";

export const metadata = { title: "Playoffs — Steak Frites" };

export default function PlayoffsPage() {
  const meta = loadMeta();
  const players = loadPlayers();
  const owners = computePlayoffOwnerRows().filter((o) => o.playoff_appearances > 0);
  const finals = computeFinalsHistory().map((f) => {
    const mvp = players.mvps_by_season[String(f.year)]?.playoff?.mvp;
    return {
      ...f,
      playoff_mvp_name: mvp?.player_name ?? null,
      playoff_mvp_position: mvp?.position ?? null,
      playoff_mvp_points: mvp?.starting_points ?? null,
    };
  });

  const totalPlayoffGames =
    owners.reduce((s, o) => s + o.playoff_games, 0) / 2; // each game counted twice
  const totalChampionships = owners.reduce((s, o) => s + o.championships, 0);
  const excludedYears = Object.keys(meta.excluded_record_years);

  return (
    <div className="space-y-12">
      <section className="club-panel overflow-hidden rounded-xl px-6 py-7 md:px-10 md:py-10">
        <div className="kicker text-[#f7d77d]">Postseason</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          Playoffs Archive
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#f7edda]/75">
          Every winners-bracket game since {meta.years[0]}. Apps, finals,
          championships, and the players who took home rings.
          {excludedYears.length > 0 &&
            ` Excludes ${excludedYears.join(", ")} (off-platform).`}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Vital n={finals.length} label="Finals" />
          <Vital n={totalChampionships} label="Rings Awarded" />
          <Vital n={fmt.pts0(totalPlayoffGames)} label="Playoff Games" />
          <Vital n={owners.length} label="Owners w/ App" />
        </div>
      </section>

      <Section
        eyebrow="Postseason"
        title="Playoff Leaderboard"
        subtitle="All-time playoff record per owner. Winners bracket only — consolation games don't count. Click any column to sort."
      >
        <PlayoffOwnersTable rows={owners} />
      </Section>

      <Section
        eyebrow="Trophy Game"
        title="Finals History"
        subtitle="Championship game by year, plus the playoff MVP that took the team there."
      >
        <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#f7edda]/40 text-[10px] font-black uppercase tracking-[0.14em] text-[#5c5549]">
              <tr>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">Champion</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-left">Runner-up</th>
                <th className="px-3 py-2 text-left">Playoff MVP</th>
                <th className="hidden px-3 py-2 text-left md:table-cell">
                  3rd Place
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {finals.map((f) => (
                <tr key={f.year} className="hover:bg-[#f7edda]/30">
                  <td className="px-3 py-3 align-top font-bold tabular-nums">
                    {f.year}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="font-bold">{f.champion_team}</div>
                    <div className="text-xs text-[#766d61]">
                      {f.champion_owners.join(", ")}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right align-top tabular-nums">
                    {f.champion_score != null && f.runner_up_score != null ? (
                      <span>
                        <span className="font-bold">{fmt.pts(f.champion_score)}</span>
                        <span className="text-[#9a9085]">
                          {" – "}
                          {fmt.pts(f.runner_up_score)}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold">{f.runner_up_team}</div>
                    <div className="text-xs text-[#766d61]">
                      {f.runner_up_owners.join(", ")}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {f.playoff_mvp_name ? (
                      <>
                        <div className="font-semibold">{f.playoff_mvp_name}</div>
                        <div className="text-xs text-[#766d61] tabular-nums">
                          {f.playoff_mvp_position ?? ""}
                          {f.playoff_mvp_points != null
                            ? ` · ${fmt.pts(f.playoff_mvp_points)} pts`
                            : ""}
                        </div>
                      </>
                    ) : (
                      <span className="text-[#9a9085]">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 align-top md:table-cell">
                    {f.third_place_team ? (
                      <>
                        <div className="font-semibold">{f.third_place_team}</div>
                        <div className="text-xs text-[#766d61]">
                          {f.third_place_owners.join(", ")}
                        </div>
                      </>
                    ) : (
                      <span className="text-[#9a9085]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Vital({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-black leading-none tabular-nums">{n}</div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f7d77d]">
        {label}
      </div>
    </div>
  );
}
