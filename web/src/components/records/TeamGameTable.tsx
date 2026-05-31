"use client";

import Link from "next/link";
import { useState } from "react";
import type { SingleTeamGame } from "@/lib/types";
import { fmt } from "@/lib/format";
import { OwnerNames, SortDir, SortHeader, cmp } from "./shared";

type ColKey = "rank" | "when" | "team" | "score" | "opp";

const COLS: Record<
  ColKey,
  { label: React.ReactNode; align: "left" | "right"; defaultDir: SortDir; sortValue: (g: SingleTeamGame, i: number) => number | string }
> = {
  rank: { label: "Rank", align: "left", defaultDir: "asc", sortValue: (_, i) => i },
  when: { label: "When", align: "left", defaultDir: "desc", sortValue: (g) => g.year * 100 + g.week },
  team: { label: "Team / Owner", align: "left", defaultDir: "asc", sortValue: (g) => g.team.toLowerCase() },
  score: { label: "Score", align: "right", defaultDir: "desc", sortValue: (g) => g.score },
  opp: { label: "Opponent", align: "left", defaultDir: "asc", sortValue: (g) => g.opp_team.toLowerCase() },
};

export default function TeamGameTable({
  title,
  rows,
  defaultSort = "score",
  defaultDir = "desc",
}: {
  title: string;
  rows: SingleTeamGame[];
  defaultSort?: ColKey;
  defaultDir?: SortDir;
}) {
  const [sortKey, setSortKey] = useState<ColKey>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  // Keep original rank by remembering the input order (which IS the leaderboard rank).
  const ranked = rows.map((r, i) => ({ row: r, originalRank: i + 1 }));
  const sorted = [...ranked].sort((a, b) => {
    const av = COLS[sortKey].sortValue(a.row, a.originalRank - 1);
    const bv = COLS[sortKey].sortValue(b.row, b.originalRank - 1);
    const c = cmp(av, bv);
    return sortDir === "asc" ? c : -c;
  });

  function click(key: ColKey) {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(COLS[key].defaultDir);
    }
  }

  return (
    <div className="table-shell rounded-lg max-h-[420px] overflow-y-auto">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            {(Object.keys(COLS) as ColKey[]).map((k) => (
              <SortHeader
                key={k}
                label={COLS[k].label}
                align={COLS[k].align}
                active={sortKey === k}
                dir={sortDir}
                onClick={() => click(k)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ row: g, originalRank }) => (
            <tr key={`${g.year}-${g.week}-${g.team_id}-${originalRank}`} className="border-t border-black/5">
              <td className="px-3 py-2 align-top">
                <span className="rank-medal" data-rank={originalRank}>{originalRank}</span>
              </td>
              <td className="px-3 py-2 text-xs font-semibold text-[#766d61] align-top whitespace-nowrap">
                <Link href={`/seasons/${g.year}`} className="hover:underline hover:text-[#123d35]">
                  {g.year} W{g.week}
                </Link>
              </td>
              <td className="px-3 py-2 align-top">
                <div className="font-bold">{g.team}</div>
                <OwnerNames
                  className="text-xs text-[#766d61]"
                  names={g.owners ?? []}
                  ids={g.owner_ids ?? []}
                />
              </td>
              <td className="px-3 py-2 text-right font-black tabular-nums align-top">{fmt.pts(g.score)}</td>
              <td className="px-3 py-2 text-xs text-[#766d61] align-top">
                <div>vs {g.opp_team} ({fmt.pts(g.opp_score)})</div>
                <OwnerNames
                  className="text-[#9a907f]"
                  names={g.opp_owners ?? []}
                  ids={g.opp_owner_ids ?? []}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
