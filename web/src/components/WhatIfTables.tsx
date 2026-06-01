"use client";

import type { WhatIfOwnerRow, WhatIfTeamRow } from "@/lib/derived";
import { fmt } from "@/lib/format";
import { SortableTable, type SortableColumn } from "./SortableTable";

function LuckCell({ n }: { n: number }) {
  const positive = n > 0.05;
  const negative = n < -0.05;
  const color = positive
    ? "text-emerald-700"
    : negative
      ? "text-rose-700"
      : "text-[#766d61]";
  const sign = n > 0 ? "+" : "";
  return (
    <span className={`font-bold tabular-nums ${color}`}>
      {sign}
      {n.toFixed(2)}
    </span>
  );
}

const OWNER_COLUMNS: SortableColumn<WhatIfOwnerRow>[] = [
  {
    key: "owner",
    label: "Owner",
    align: "left",
    defaultDir: "asc",
    sortValue: (r) => r.display_name.toLowerCase(),
    cell: (r) => <span className="font-semibold">{r.display_name}</span>,
  },
  {
    key: "seasons",
    label: "Seasons",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.seasons,
    cell: (r) => r.seasons,
    hideUnder: "md",
  },
  {
    key: "actual",
    label: "Actual W",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.actual_wins,
    cell: (r) => r.actual_wins,
    title: "Actual regular-season wins",
  },
  {
    key: "expected",
    label: "Expected W",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.expected_wins,
    cell: (r) => fmt.pts(r.expected_wins),
    title: "Pythagorean expected wins (exponent 2.37) from PF/PA",
  },
  {
    key: "luck_vs_pyth",
    label: "Luck (Pyth)",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.luck_vs_pyth,
    cell: (r) => <LuckCell n={r.luck_vs_pyth} />,
    title: "Actual wins − Pythagorean expected wins. Positive = lucky.",
  },
  {
    key: "all_play_record",
    label: "All-Play",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.all_play_win_pct,
    cell: (r) => (
      <span>
        <span className="font-semibold">{fmt.pct(r.all_play_win_pct)}</span>
        <span className="ml-2 text-xs text-[#9a9085]">
          {r.all_play_wins}-{r.all_play_losses}
        </span>
      </span>
    ),
    hideUnder: "sm",
    title: "If you played every team every week",
  },
  {
    key: "luck_vs_all_play",
    label: "Luck (AP)",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.luck_vs_all_play,
    cell: (r) => <LuckCell n={r.luck_vs_all_play} />,
    hideUnder: "md",
    title: "Actual wins − all-play expected wins",
  },
  {
    key: "actual_pct",
    label: "Actual Win %",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.actual_win_pct,
    cell: (r) => fmt.pct(r.actual_win_pct),
    hideUnder: "lg",
  },
  {
    key: "pyth_pct",
    label: "Pyth Win %",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.pyth_win_pct,
    cell: (r) => fmt.pct(r.pyth_win_pct),
    hideUnder: "lg",
  },
];

const SEASON_COLUMNS: SortableColumn<WhatIfTeamRow>[] = [
  {
    key: "team",
    label: "Team",
    align: "left",
    defaultDir: "asc",
    sortValue: (r) => r.team.toLowerCase(),
    cell: (r) => (
      <div>
        <div className="font-semibold">{r.team}</div>
        <div className="text-xs text-[#766d61]">{r.owner_names.join(", ")}</div>
      </div>
    ),
  },
  {
    key: "record",
    label: "Record",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.wins,
    cell: (r) => fmt.record(r.wins, r.losses, r.ties),
  },
  {
    key: "expected",
    label: "Expected W",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.pyth_expected_wins,
    cell: (r) => fmt.pts(r.pyth_expected_wins),
  },
  {
    key: "luck_vs_pyth",
    label: "Luck (Pyth)",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.luck_vs_pyth,
    cell: (r) => <LuckCell n={r.luck_vs_pyth} />,
  },
  {
    key: "all_play",
    label: "All-Play %",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.all_play_win_pct,
    cell: (r) => fmt.pct(r.all_play_win_pct),
    hideUnder: "sm",
  },
  {
    key: "luck_vs_all_play",
    label: "Luck (AP)",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.luck_vs_all_play,
    cell: (r) => <LuckCell n={r.luck_vs_all_play} />,
    hideUnder: "sm",
  },
  {
    key: "pf",
    label: "PF",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.points_for,
    cell: (r) => fmt.pts(r.points_for),
    hideUnder: "md",
  },
  {
    key: "pa",
    label: "PA",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.points_against,
    cell: (r) => fmt.pts(r.points_against),
    hideUnder: "md",
  },
];

export function WhatIfOwnersTable({ rows }: { rows: WhatIfOwnerRow[] }) {
  return (
    <SortableTable
      rows={rows}
      columns={OWNER_COLUMNS}
      defaultSort={{ key: "luck_vs_pyth", dir: "asc" }}
      rowKey={(r) => r.owner_id}
    />
  );
}

export function WhatIfSeasonTable({ rows }: { rows: WhatIfTeamRow[] }) {
  return (
    <SortableTable
      rows={rows}
      columns={SEASON_COLUMNS}
      defaultSort={{ key: "luck_vs_pyth", dir: "desc" }}
      rowKey={(r) => `${r.year}-${r.team_id}`}
    />
  );
}
