"use client";

import { useMemo, useState } from "react";

type SortDir = "asc" | "desc";

export type SortableColumn<T> = {
  key: string;
  label: React.ReactNode;
  align?: "left" | "right";
  defaultDir?: SortDir;
  sortValue: (row: T) => number | string;
  cell: (row: T) => React.ReactNode;
  hideUnder?: "sm" | "md" | "lg";
  title?: string;
};

const HIDE_CLASS: Record<NonNullable<SortableColumn<unknown>["hideUnder"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function SortableTable<T>({
  rows,
  columns,
  defaultSort,
  rowKey,
  rowClassName,
}: {
  rows: T[];
  columns: SortableColumn<T>[];
  defaultSort: { key: string; dir: SortDir };
  rowKey: (row: T, i: number) => string;
  rowClassName?: (row: T, i: number) => string;
}) {
  const [sort, setSort] = useState(defaultSort);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, columns, sort]);

  function clickHeader(col: SortableColumn<T>) {
    if (sort.key === col.key) {
      setSort({ key: col.key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key: col.key, dir: col.defaultDir ?? "desc" });
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#f7edda]/40 text-[10px] font-black uppercase tracking-[0.14em] text-[#5c5549]">
          <tr>
            {columns.map((c) => {
              const active = sort.key === c.key;
              const hide = c.hideUnder ? HIDE_CLASS[c.hideUnder] : "";
              return (
                <th
                  key={c.key}
                  scope="col"
                  title={c.title}
                  onClick={() => clickHeader(c)}
                  className={`cursor-pointer select-none px-3 py-2 ${
                    c.align === "right" ? "text-right" : "text-left"
                  } ${active ? "text-[#123d35]" : ""} ${hide}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <span aria-hidden className="text-[8px]">
                      {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {sorted.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              className={`hover:bg-[#f7edda]/30 ${rowClassName?.(r, i) ?? ""}`}
            >
              {columns.map((c) => {
                const hide = c.hideUnder ? HIDE_CLASS[c.hideUnder] : "";
                return (
                  <td
                    key={c.key}
                    className={`px-3 py-2 tabular-nums ${
                      c.align === "right" ? "text-right" : "text-left"
                    } ${hide}`}
                  >
                    {c.cell(r)}
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
