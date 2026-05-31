"use client";

import { useMemo, useState } from "react";
import type { AdpPlayer, KeeperCandidate } from "@/lib/types";
import { bandForRound, priceCandidate, validateKeeperSet } from "@/lib/keeper-rules";

type TeamGroup = {
  team_id: number;
  team_name: string;
  owners: string;
  candidates: KeeperCandidate[];
};

export default function KeeperValidator({
  teamGroups,
  adp,
  rules,
  teamCount,
  faaLastRound,
}: {
  teamGroups: TeamGroup[];
  adp: AdpPlayer[];
  rules: { max_total: number; max_rounds_4_to_7: number; max_rounds_8_to_16: number };
  teamCount: number;
  faaLastRound: number;
}) {
  const [activeTeamId, setActiveTeamId] = useState<number>(teamGroups[0]?.team_id ?? 0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const adpByPlayerId = useMemo(() => {
    const m = new Map<number, AdpPlayer>();
    for (const p of adp) m.set(p.player_id, p);
    return m;
  }, [adp]);

  const team = teamGroups.find((t) => t.team_id === activeTeamId);

  const priced = useMemo(
    () =>
      (team?.candidates ?? []).map((c) =>
        priceCandidate(c, adpByPlayerId, teamCount, faaLastRound),
      ),
    [team, adpByPlayerId, teamCount, faaLastRound],
  );

  const selectedCosts = priced.filter((p) => selected.has(p.candidate.player_id));
  const validation = validateKeeperSet(selectedCosts, rules);

  function toggle(pid: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  function switchTeam(id: number) {
    setActiveTeamId(id);
    setSelected(new Set());
  }

  // Sort candidates: eligible-by-cost ascending, then ineligible (rounds 1-3) at the bottom.
  const sorted = [...priced].sort((a, b) => {
    const ai = bandForRound(a.cost_round) === "blocked" ? 1 : 0;
    const bi = bandForRound(b.cost_round) === "blocked" ? 1 : 0;
    if (ai !== bi) return ai - bi;
    return a.cost_round - b.cost_round;
  });

  return (
    <div className="premium-panel rounded-xl p-4">
      {/* Team picker */}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-2">
          <div className="kicker px-1">Team Room</div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {teamGroups.map((t) => (
              <button
                key={t.team_id}
                onClick={() => switchTeam(t.team_id)}
                className={`min-w-max rounded-lg border px-3 py-2 text-left text-sm font-bold transition lg:min-w-0 ${
                  t.team_id === activeTeamId
                    ? "border-[#123d35] bg-[#123d35] text-[#fffaf0] shadow-sm"
                    : "border-black/10 bg-[#fffdf7] text-[#3b3328] hover:border-[#c8962d]/50"
                }`}
              >
                {t.team_name}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          {team && (
            <div className="flex flex-col gap-2 rounded-lg border border-black/10 bg-[#fffdf7]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-black">{team.team_name}</div>
                <div className="text-sm font-medium text-[#766d61]">{team.owners}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-green">{team.candidates.length} eligible</span>
                <span className="badge badge-gold">{selected.size}/{rules.max_total} selected</span>
              </div>
            </div>
          )}

          {/* Validation banner */}
          <div
            className={`rounded-lg border p-4 text-sm ${
              selected.size === 0
                ? "border-black/10 bg-[#fffdf7]/70 text-[#5c5549]"
                : validation.legal
                ? "border-[#2f6f4e]/25 bg-[#2f6f4e]/10 text-[#164331]"
                : "border-[#7d1d1d]/25 bg-[#7d1d1d]/10 text-[#711818]"
            }`}
          >
            {selected.size === 0 ? (
              <span className="font-semibold">Select up to {rules.max_total} keepers to validate.</span>
            ) : validation.legal ? (
              <>
                <div className="font-black">Legal keeper combo ({selected.size}/{rules.max_total})</div>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {selectedCosts.map((s) => (
                    <li key={s.candidate.player_id} className="font-medium">
                      {s.candidate.player_name} · Round {s.cost_round}{" "}
                      <span className="text-xs opacity-70">
                        ({s.cost_source === "adp"
                          ? `via ADP ${s.adp?.toFixed(1)}`
                          : s.cost_source === "fa"
                          ? "free agent"
                          : "draft round"})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="font-black">Illegal keeper combo</div>
                <ul className="mt-2 list-disc list-inside">
                  {validation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Candidate list */}
          <div className="table-shell rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="px-3 py-3 w-8"></th>
                  <th className="px-3 py-3">Player</th>
                  <th className="px-3 py-3">Pos</th>
                  <th className="px-3 py-3 text-right">Last Yr Rd</th>
                  <th className="px-3 py-3 text-right">ADP</th>
                  <th className="px-3 py-3 text-right">Streak</th>
                  <th className="px-3 py-3 text-right">Keeper Cost</th>
                  <th className="px-3 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const blocked = bandForRound(p.cost_round) === "blocked";
                  const isSelected = selected.has(p.candidate.player_id);
                  return (
                    <tr
                      key={p.candidate.player_id}
                      className={`border-t border-black/5 ${blocked ? "opacity-50" : ""} ${
                        isSelected ? "bg-[#f1dfaa]/35" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(p.candidate.player_id)}
                          disabled={blocked && !isSelected}
                          className="h-4 w-4 accent-[#123d35]"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-bold">{p.candidate.player_name}</td>
                      <td className="px-3 py-2.5">
                        <span className="badge py-1">{p.candidate.position ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {p.candidate.base_round_this_year ?? <span className="text-[#9a907f]">FA</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {p.adp != null ? p.adp.toFixed(1) : <span className="text-[#9a907f]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {p.candidate.consecutive_keeper_years_through_current}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums">
                        {blocked ? <span className="badge badge-red">Blocked</span> : <span className="badge badge-gold">R{p.cost_round}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-[#766d61]">
                        {p.cost_source === "adp" ? "ADP (2yr+ streak)" : p.cost_source === "fa" ? "Free agent" : "Last year's draft"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs font-medium leading-5 text-[#766d61]">
            Rules: max {rules.max_total} keepers · rounds 1-3 blocked · max{" "}
            {rules.max_rounds_4_to_7} from rounds 4-7 · max {rules.max_rounds_8_to_16} from rounds 8-16 · free agents
            count as round {faaLastRound} · back-to-back+ keepers cost their ADP-equivalent round.
          </p>
        </div>
      </div>
    </div>
  );
}
