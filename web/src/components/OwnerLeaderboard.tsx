"use client";

import Link from "next/link";
import { useState } from "react";
import type { OwnerAllTime } from "@/lib/types";
import { fmt } from "@/lib/format";

type SortDir = "asc" | "desc";

type ColKey =
  | "owner"
  | "seasons"
  | "record"
  | "win_pct"
  | "points_for"
  | "points_against"
  | "ppg"
  | "championships"
  | "runner_ups"
  | "third_place_finishes"
  | "playoff_appearances";

type ColumnDef = {
  key: ColKey;
  label: React.ReactNode;
  align: "left" | "right";
  defaultDir: SortDir;
  /** Returns the value to sort by. */
  sortValue: (o: OwnerAllTime) => number | string;
  /** Returns the displayed cell value (no extra formatting like links). */
  cell: (o: OwnerAllTime) => React.ReactNode;
  /** Tailwind viewport prefix below which the column is hidden. */
  hideUnder?: "sm" | "md" | "lg";
};

/** Maps `hideUnder` to the Tailwind class that hides on smaller, shows at >=. */
const HIDE_CLASS: Record<NonNullable<ColumnDef["hideUnder"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

const COLS: Record<ColKey, ColumnDef> = {
  owner: {
    key: "owner",
    label: "Owner",
    align: "left",
    defaultDir: "asc",
    sortValue: (o) => o.display_name.toLowerCase(),
    cell: (o) => o.display_name, // owner cell is rendered with extras inline
  },
  seasons: {
    key: "seasons",
    label: "Seasons",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.seasons,
    cell: (o) => o.seasons,
    hideUnder: "md",
  },
  record: {
    key: "record",
    label: "Record",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.wins,
    cell: (o) => fmt.record(o.wins, o.losses, o.ties),
  },
  win_pct: {
    key: "win_pct",
    label: "Win %",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.win_pct,
    cell: (o) => fmt.pct(o.win_pct),
  },
  points_for: {
    key: "points_for",
    label: "PF",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.points_for,
    cell: (o) => fmt.pts(o.points_for),
  },
  points_against: {
    key: "points_against",
    label: "PA",
    align: "right",
    defaultDir: "asc",
    sortValue: (o) => o.points_against,
    cell: (o) => fmt.pts(o.points_against),
    hideUnder: "md",
  },
  ppg: {
    key: "ppg",
    label: "PPG",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.ppg,
    cell: (o) => fmt.pts(o.ppg),
    hideUnder: "md",
  },
  championships: {
    key: "championships",
    label: "🏆",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.championships,
    cell: (o) => o.championships || "—",
  },
  runner_ups: {
    key: "runner_ups",
    label: "🥈",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.runner_ups,
    cell: (o) => o.runner_ups || "—",
    hideUnder: "lg",
  },
  third_place_finishes: {
    key: "third_place_finishes",
    label: "🥉",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.third_place_finishes,
    cell: (o) => o.third_place_finishes || "—",
    hideUnder: "lg",
  },
  playoff_appearances: {
    key: "playoff_appearances",
    label: "Playoffs",
    align: "right",
    defaultDir: "desc",
    sortValue: (o) => o.playoff_appearances,
    cell: (o) => o.playoff_appearances,
    hideUnder: "lg",
  },
};

export default function OwnerLeaderboard({
  rows,
  columns,
  defaultSort,
  activeOwnerIds,
  coOwnerNamesById,
}: {
  rows: OwnerAllTime[];
  /** Ordered list of column keys to render. */
  columns: ColKey[];
  defaultSort: { key: ColKey; dir: SortDir };
  /** If provided, owners in this set get a ⭐ next to their name. */
  activeOwnerIds?: string[];
  /** If provided, owner ids in this map render a "w/ ..." annotation under the name. */
  coOwnerNamesById?: Record<string, string[]>;
}) {
  const [sortKey, setSortKey] = useState<ColKey>(defaultSort.key);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort.dir);
  const activeSet = new Set(activeOwnerIds ?? []);

  const activeCol = COLS[sortKey];
  const sorted = [...rows].sort((a, b) => {
    const av = activeCol.sortValue(a);
    const bv = activeCol.sortValue(b);
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleHeaderClick(key: ColKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(COLS[key].defaultDir);
    }
  }

  return (
    <div className="table-shell rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 text-left">
          <tr>
            <th className="px-3 py-3 text-xs font-black uppercase tracking-[0.14em]">Rank</th>
            {columns.map((k) => {
              const c = COLS[k];
              const isSorted = c.key === sortKey;
              const hideClass = c.hideUnder ? HIDE_CLASS[c.hideUnder] : "";
              return (
                <th
                  key={c.key}
                  className={`cursor-pointer select-none px-3 py-3 text-xs font-black uppercase tracking-[0.14em] hover:text-[#123d35] ${hideClass} ${
                    c.align === "right" ? "text-right" : ""
                  } ${isSorted ? "text-[#123d35]" : ""}`}
                  onClick={() => handleHeaderClick(c.key)}
                  aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-baseline gap-1">
                    {c.label}
                    {isSorted && (
                      <span aria-hidden className="text-[10px] text-[#8a6a22]">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((o, i) => (
            <tr key={o.owner_id} className="border-t border-black/5 transition-colors hover:bg-[#c8962d]/[0.12]">
              <td className="px-3 py-2.5 text-[#766d61]">
                <span className="rank-medal" data-rank={i + 1}>{i + 1}</span>
              </td>
              {columns.map((k) => {
                const c = COLS[k];
                const hideClass = c.hideUnder ? HIDE_CLASS[c.hideUnder] : "";
                if (k === "owner") {
                  const isActive = activeSet.has(o.owner_id);
                  const coOwners = coOwnerNamesById?.[o.owner_id] ?? [];
                  return (
                    <td key={k} className="px-3 py-2.5">
                      <Link
                        href={`/teams/${encodeURIComponent(o.owner_id)}`}
                        className="flex items-center gap-3 font-bold hover:text-[#123d35]"
                      >
                        <span className="owner-avatar">{initials(o.display_name)}</span>
                        <span>
                          <span className="flex items-center gap-2">
                            {o.display_name}
                            {isActive && (
                              <span className="badge badge-green py-1 text-[10px]" title="Active in the current season">Active</span>
                            )}
                          </span>
                          {coOwners.length > 0 && (
                            <span className="block text-xs font-medium text-[#766d61]">with {coOwners.join(", ")}</span>
                          )}
                        </span>
                      </Link>
                    </td>
                  );
                }
                return (
                  <td
                    key={k}
                    className={`px-3 py-2.5 font-semibold text-[#3b3328] ${hideClass} ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                  >
                    {c.cell(o)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
