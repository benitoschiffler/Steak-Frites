"use client";

import Link from "next/link";
import { useState } from "react";
import type { StreakRow } from "@/lib/types";
import { SortDir, SortHeader, cmp } from "./shared";

type ColKey = "rank" | "owner" | "streak" | "when";

function fmtRange(rng: [[number, number], [number, number]] | null): string {
  if (!rng) return "—";
  const [a, b] = rng;
  return `${a[0]} W${a[1]} → ${b[0]} W${b[1]}`;
}

export default function StreakTable({
  title,
  rows,
  kind,
}: {
  title: string;
  rows: StreakRow[];
  kind: "win" | "loss";
}) {
  const [sortKey, setSortKey] = useState<ColKey>("streak");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const COLS: Record<
    ColKey,
    { label: React.ReactNode; align: "left" | "right"; defaultDir: SortDir; sortValue: (r: StreakRow, i: number) => number | string }
  > = {
    rank: { label: "Rank", align: "left", defaultDir: "asc", sortValue: (_, i) => i },
    owner: { label: "Owner", align: "left", defaultDir: "asc", sortValue: (r) => r.display_name.toLowerCase() },
    streak: {
      label: "Streak",
      align: "right",
      defaultDir: "desc",
      sortValue: (r) => (kind === "win" ? r.longest_win_streak : r.longest_loss_streak),
    },
    when: {
      label: "When",
      align: "left",
      defaultDir: "asc",
      sortValue: (r) => {
        const rng = kind === "win" ? r.win_streak_range : r.loss_streak_range;
        return rng ? rng[0][0] * 100 + rng[0][1] : 0;
      },
    },
  };

  // Pre-sort by streak desc so the initial "rank" reflects streak ordering.
  const preranked = [...rows].sort(
    (a, b) =>
      (kind === "win" ? b.longest_win_streak - a.longest_win_streak : b.longest_loss_streak - a.longest_loss_streak),
  );
  const withRank = preranked.map((r, i) => ({ row: r, originalRank: i + 1 }));

  const sorted = [...withRank].sort((a, b) => {
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
          {sorted.map(({ row: s, originalRank }) => {
            const count = kind === "win" ? s.longest_win_streak : s.longest_loss_streak;
            const range = kind === "win" ? s.win_streak_range : s.loss_streak_range;
            return (
              <tr key={s.owner_id} className="border-t border-black/5">
                <td className="px-3 py-2">
                  <span className="rank-medal" data-rank={originalRank}>{originalRank}</span>
                </td>
                <td className="px-3 py-2 font-bold">
                  <Link href={`/teams/${encodeURIComponent(s.owner_id)}`} className="hover:underline hover:text-[#123d35]">
                    {s.display_name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right font-black tabular-nums">{count}</td>
                <td className="px-3 py-2 text-xs font-medium text-[#766d61]">{fmtRange(range)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
