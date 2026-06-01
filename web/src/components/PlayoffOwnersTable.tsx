"use client";

import type { PlayoffOwnerRow } from "@/lib/derived";
import { fmt } from "@/lib/format";
import { SortableTable, type SortableColumn } from "./SortableTable";

const COLUMNS: SortableColumn<PlayoffOwnerRow>[] = [
  {
    key: "owner",
    label: "Owner",
    align: "left",
    defaultDir: "asc",
    sortValue: (r) => r.display_name.toLowerCase(),
    cell: (r) => <span className="font-semibold">{r.display_name}</span>,
  },
  {
    key: "playoff_appearances",
    label: "Apps",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.playoff_appearances,
    cell: (r) => r.playoff_appearances,
    title: "Distinct seasons with at least one playoff game",
  },
  {
    key: "record",
    label: "Playoff W-L",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.playoff_wins,
    cell: (r) => fmt.record(r.playoff_wins, r.playoff_losses, 0),
    title: "Winners-bracket only (excludes consolation games)",
  },
  {
    key: "win_pct",
    label: "Win %",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.playoff_win_pct,
    cell: (r) => fmt.pct(r.playoff_win_pct),
    hideUnder: "sm",
  },
  {
    key: "championships",
    label: "🏆",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.championships,
    cell: (r) => r.championships || "—",
    title: "Championships",
  },
  {
    key: "runner_ups",
    label: "🥈",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.runner_ups,
    cell: (r) => r.runner_ups || "—",
    title: "Runner-ups",
  },
  {
    key: "third_place_finishes",
    label: "🥉",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.third_place_finishes,
    cell: (r) => r.third_place_finishes || "—",
    hideUnder: "sm",
    title: "Third-place finishes",
  },
  {
    key: "finals_appearances",
    label: "Finals",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.finals_appearances,
    cell: (r) => r.finals_appearances || "—",
    hideUnder: "md",
    title: "Championship game appearances (1st + 2nd)",
  },
  {
    key: "playoff_ppg",
    label: "Playoff PPG",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.playoff_ppg,
    cell: (r) => fmt.pts(r.playoff_ppg),
    hideUnder: "md",
  },
  {
    key: "playoff_pf",
    label: "Playoff PF",
    align: "right",
    defaultDir: "desc",
    sortValue: (r) => r.playoff_pf,
    cell: (r) => fmt.pts(r.playoff_pf),
    hideUnder: "lg",
  },
  {
    key: "best_finish",
    label: "Best",
    align: "right",
    defaultDir: "asc",
    sortValue: (r) => r.best_finish ?? 999,
    cell: (r) => (r.best_finish ? fmt.ordinal(r.best_finish) : "—"),
    hideUnder: "lg",
  },
];

export default function PlayoffOwnersTable({ rows }: { rows: PlayoffOwnerRow[] }) {
  return (
    <SortableTable
      rows={rows}
      columns={COLUMNS}
      defaultSort={{ key: "championships", dir: "desc" }}
      rowKey={(r) => r.owner_id}
    />
  );
}
