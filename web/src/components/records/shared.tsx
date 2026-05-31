"use client";

import Link from "next/link";

export type SortDir = "asc" | "desc";

/**
 * Renders a list of owner names as comma-separated links to /teams/[ownerId].
 * Falls back to plain text if ids are missing.
 */
export function OwnerNames({
  names,
  ids,
  className,
}: {
  names: string[];
  ids?: string[];
  className?: string;
}) {
  if (!names?.length) return <span className={className}>—</span>;
  return (
    <span className={className}>
      {names.map((n, i) => {
        const id = ids?.[i];
        return (
          <span key={`${id ?? n}-${i}`}>
            {i > 0 && ", "}
            {id ? (
              <Link
                href={`/teams/${encodeURIComponent(id)}`}
                className="hover:underline hover:text-[#123d35]"
              >
                {n}
              </Link>
            ) : (
              n
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Sort indicator: small gold arrow when active, nothing when idle. */
export function SortMark({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return (
    <span aria-hidden className="ml-1 text-[10px] text-[#8a6a22]">
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

/** Standard table header cell - clickable for sort, with subtle hover. */
export function SortHeader({
  label,
  align,
  active,
  dir,
  onClick,
  sortable = true,
}: {
  label: React.ReactNode;
  align?: "left" | "right";
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  sortable?: boolean;
}) {
  return (
    <th
      onClick={sortable ? onClick : undefined}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-3 text-xs font-black uppercase tracking-[0.14em] ${
        align === "right" ? "text-right" : ""
      } ${sortable ? "cursor-pointer select-none hover:text-[#123d35]" : ""} ${
        active ? "text-[#123d35]" : "text-[#5b554c]"
      }`}
    >
      <span className="inline-flex items-baseline">
        {label}
        <SortMark active={active} dir={dir} />
      </span>
    </th>
  );
}

/**
 * Shared comparator: number-aware, otherwise string locale compare.
 * Returns -1/0/1 from a vs b, caller flips for desc.
 */
export function cmp(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
