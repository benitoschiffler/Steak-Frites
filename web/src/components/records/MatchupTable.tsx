"use client";

import Link from "next/link";
import { useState } from "react";
import type { MatchupGame } from "@/lib/types";
import { fmt } from "@/lib/format";
import { OwnerNames, SortDir, SortHeader, cmp } from "./shared";

type ColKey = "rank" | "when" | "matchup" | "value";

export default function MatchupTable({
  title,
  rows,
  valueKey,
  defaultSort = "value",
  defaultDir = "desc",
}: {
  title: string;
  rows: MatchupGame[];
  valueKey: "margin" | "combined";
  defaultSort?: ColKey;
  defaultDir?: SortDir;
}) {
  const [sortKey, setSortKey] = useState<ColKey>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const COLS: Record<
    ColKey,
    { label: React.ReactNode; align: "left" | "right"; defaultDir: SortDir; sortValue: (g: MatchupGame, i: number) => number | string }
  > = {
    rank: { label: "Rank", align: "left", defaultDir: "asc", sortValue: (_, i) => i },
    when: { label: "When", align: "left", defaultDir: "desc", sortValue: (g) => g.year * 100 + g.week },
    matchup: { label: "Matchup", align: "left", defaultDir: "asc", sortValue: (g) => g.home_team.toLowerCase() },
    value: {
      label: valueKey === "margin" ? "Margin" : "Total",
      align: "right",
      defaultDir: "desc",
      sortValue: (g) => g[valueKey],
    },
  };

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
    <div className="table-shell rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead>
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
          {sorted.map(({ row: g, originalRank }) => {
            const homeWon = g.home_score > g.away_score;
            const awayWon = g.away_score > g.home_score;
            return (
              <tr key={`${g.year}-${g.week}-${originalRank}`} className="border-t border-black/5">
                <td className="px-3 py-2 align-top">
                  <span className="rank-medal" data-rank={originalRank}>{originalRank}</span>
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-[#766d61] align-top whitespace-nowrap">
                  <Link href={`/seasons/${g.year}`} className="hover:underline hover:text-[#123d35]">
                    {g.year} W{g.week}
                  </Link>
                </td>
                <td className="px-3 py-2 align-top">
                  <div>
                    <span className={homeWon ? "font-bold" : ""}>{g.home_team}</span>{" "}
                    <span className="text-[#766d61] tabular-nums">{fmt.pts(g.home_score)} – {fmt.pts(g.away_score)}</span>{" "}
                    <span className={awayWon ? "font-bold" : ""}>{g.away_team}</span>
                  </div>
                  <div className="text-xs text-[#766d61]">
                    <OwnerNames names={g.home_owners ?? []} ids={g.home_owner_ids ?? []} />
                    <span className="text-[#b9ae9d]"> vs </span>
                    <OwnerNames names={g.away_owners ?? []} ids={g.away_owner_ids ?? []} />
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-black tabular-nums align-top">{fmt.pts(g[valueKey])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
