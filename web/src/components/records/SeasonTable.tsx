"use client";

import Link from "next/link";
import { useState } from "react";
import type { SeasonTeamRow } from "@/lib/types";
import { fmt } from "@/lib/format";
import { OwnerNames, SortDir, SortHeader, cmp } from "./shared";

type ColKey = "rank" | "year" | "team" | "record" | "stat";

export default function SeasonTable({
  title,
  rows,
  valueKey,
  defaultSort = "stat",
  defaultDir = "desc",
}: {
  title: string;
  rows: SeasonTeamRow[];
  valueKey: "points_for" | "ppg";
  defaultSort?: ColKey;
  defaultDir?: SortDir;
}) {
  const [sortKey, setSortKey] = useState<ColKey>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const COLS: Record<
    ColKey,
    { label: React.ReactNode; align: "left" | "right"; defaultDir: SortDir; sortValue: (r: SeasonTeamRow, i: number) => number | string }
  > = {
    rank: { label: "Rank", align: "left", defaultDir: "asc", sortValue: (_, i) => i },
    year: { label: "Year", align: "left", defaultDir: "desc", sortValue: (r) => r.year },
    team: { label: "Team", align: "left", defaultDir: "asc", sortValue: (r) => r.team.toLowerCase() },
    record: { label: "Record", align: "right", defaultDir: "desc", sortValue: (r) => r.wins },
    stat: {
      label: valueKey === "points_for" ? "PF" : "PPG",
      align: "right",
      defaultDir: "desc",
      sortValue: (r) => r[valueKey],
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
          {sorted.map(({ row: s, originalRank }) => (
            <tr key={`${s.year}-${s.team_id}-${originalRank}`} className="border-t border-black/5">
              <td className="px-3 py-2">
                <span className="rank-medal" data-rank={originalRank}>{originalRank}</span>
              </td>
              <td className="px-3 py-2 text-xs font-semibold text-[#766d61]">
                <Link href={`/seasons/${s.year}`} className="hover:underline hover:text-[#123d35]">{s.year}</Link>
              </td>
              <td className="px-3 py-2">
                <div className="font-bold">{s.team}</div>
                <OwnerNames
                  className="text-xs text-[#766d61]"
                  names={s.owner_names ?? []}
                  ids={s.owner_ids ?? []}
                />
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt.record(s.wins, s.losses, s.ties)}</td>
              <td className="px-3 py-2 text-right font-black tabular-nums">{fmt.pts(s[valueKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
