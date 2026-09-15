import Link from "next/link";
import { fmt } from "@/lib/format";
import type { PlayerPerformance } from "@/lib/types";

export default function PlayerRecordTable({
  title,
  rows,
  metric = "points",
}: {
  title: string;
  rows: PlayerPerformance[];
  metric?: "points" | "share";
}) {
  return (
    <div className="table-shell max-h-[420px] overflow-y-auto rounded-lg">
      <div className="border-b border-black/10 bg-[#123d35]/[0.06] px-3 py-3 text-sm font-black">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Rank</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Player</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">When</th>
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.14em]">Fantasy Team</th>
            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.14em]">
              {metric === "share" ? "Share" : "Pts"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.year}-${row.week}-${row.player_id}-${row.team_id}`} className="border-t border-black/5">
              <td className="px-3 py-2.5 align-top">
                <span className="rank-medal" data-rank={index + 1}>{index + 1}</span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-bold">{row.player_name}</div>
                <div className="text-[11px] text-[#766d61]">
                  {[row.position, row.pro_team].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs font-semibold text-[#766d61]">
                <Link href={`/seasons/${row.year}`} className="hover:text-[#123d35] hover:underline">
                  {row.year} W{row.week}
                </Link>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-bold">
                  {row.owner_names.map((name, ownerIndex) => {
                    const ownerId = row.owner_ids[ownerIndex];
                    return (
                      <span key={`${ownerId ?? name}-${ownerIndex}`}>
                        {ownerIndex > 0 && ", "}
                        {ownerId ? (
                          <Link href={`/teams/${encodeURIComponent(ownerId)}`} className="hover:text-[#123d35] hover:underline">
                            {name}
                          </Link>
                        ) : name}
                      </span>
                    );
                  })}
                </div>
                <div className="text-[11px] text-[#766d61]">{row.team_name ?? "—"}</div>
              </td>
              <td className="px-3 py-2.5 text-right align-top font-black tabular-nums">
                {metric === "share" && row.team_share != null
                  ? `${(row.team_share * 100).toFixed(1)}%`
                  : fmt.pts(row.points)}
                {metric === "share" && (
                  <div className="text-[10px] font-semibold text-[#766d61]">{fmt.pts(row.points)} pts</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
