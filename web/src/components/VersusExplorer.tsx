"use client";

import { useState } from "react";
import type { VersusGame, VersusRecord } from "@/lib/versus";

type OwnerOption = { id: string; name: string; active: boolean };

export function VersusExplorer({ owners, records, initialOwnerId, initialOpponentId }: { owners: OwnerOption[]; records: VersusRecord[]; initialOwnerId: string; initialOpponentId: string }) {
  const [ownerId, setOwnerId] = useState(initialOwnerId);
  const [opponentId, setOpponentId] = useState(initialOpponentId);
  const owner = owners.find((item) => item.id === ownerId);
  const opponent = owners.find((item) => item.id === opponentId);
  const record = records.find((item) => item.ownerId === ownerId && item.opponentId === opponentId);

  function changeOwner(nextId: string) {
    setOwnerId(nextId);
    if (nextId === opponentId) setOpponentId(owners.find((item) => item.id !== nextId)?.id ?? "");
  }

  return (
    <div className="space-y-6">
      <div className="premium-panel grid gap-4 rounded-xl p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <OwnerSelect label="Owner" value={ownerId} options={owners} onChange={changeOwner} />
        <div className="pb-3 text-center text-xs font-black uppercase tracking-[0.2em] text-[#8a6a22]">versus</div>
        <OwnerSelect label="Opponent" value={opponentId} options={owners.filter((item) => item.id !== ownerId)} onChange={setOpponentId} />
      </div>
      {!record ? <div className="premium-panel rounded-xl p-8 text-center font-semibold text-[#766d61]">These owners have never faced each other in the ESPN record.</div> : (
        <>
          <section className="club-panel rounded-xl p-6 text-center md:p-10">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f7d77d]">All-time series</div>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div><div className="text-xl font-black md:text-3xl">{owner?.name}</div><div className="mt-3 text-5xl font-black text-[#f7d77d] md:text-7xl">{record.wins}</div></div>
              <div className="text-[#f7edda]/60"><div className="text-sm font-bold">{record.ties ? `${record.ties} tie${record.ties === 1 ? "" : "s"}` : "—"}</div><div className="mt-2 text-2xl font-black">–</div></div>
              <div><div className="text-xl font-black md:text-3xl">{opponent?.name}</div><div className="mt-3 text-5xl font-black text-[#f7d77d] md:text-7xl">{record.losses}</div></div>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3 text-xs font-bold text-[#f7edda]/75">
              <span>{record.pointsFor.toFixed(1)}–{record.pointsAgainst.toFixed(1)} total points</span><span>·</span><span>{record.currentStreak} current streak</span><span>·</span><span>{record.playoffWins}–{record.playoffLosses} playoffs</span>
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MomentCard label={`${owner?.name?.split(" ")[0]}'s biggest win`} game={record.biggestWin} />
            <MomentCard label={`${opponent?.name?.split(" ")[0]}'s biggest win`} game={record.biggestLoss} reverse />
            <MomentCard label="Closest finish" game={record.closestGame} />
            <MomentCard label="Highest-scoring clash" game={record.highestScoringGame} />
          </div>
          <section className="premium-panel overflow-hidden rounded-xl">
            <div className="border-b border-black/10 p-5"><div className="kicker">The tape</div><h2 className="mt-1 text-2xl font-black">Every meeting</h2></div>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Season</th><th className="px-4 py-3 text-left">Matchup</th><th className="px-4 py-3 text-right">Score</th><th className="px-4 py-3 text-right">Result</th></tr></thead><tbody>{record.games.map((game) => <tr key={`${game.year}-${game.week}`} className="border-t border-black/5"><td className="px-4 py-3 font-bold">{game.year} W{game.week}{game.isPlayoff ? " · Playoffs" : ""}</td><td className="px-4 py-3 text-[#6f6a60]">{game.ownerTeam} vs {game.opponentTeam}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{game.ownerScore.toFixed(1)}–{game.opponentScore.toFixed(1)}</td><td className="px-4 py-3 text-right"><span className={`badge ${game.ownerScore > game.opponentScore ? "badge-green" : game.ownerScore < game.opponentScore ? "" : "badge-gold"}`}>{game.ownerScore > game.opponentScore ? "W" : game.ownerScore < game.opponentScore ? "L" : "T"}</span></td></tr>)}</tbody></table></div>
          </section>
        </>
      )}
    </div>
  );
}

function OwnerSelect({ label, value, options, onChange }: { label: string; value: string; options: OwnerOption[]; onChange: (value: string) => void }) {
  return <label className="block"><span className="kicker">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-3 font-black outline-none focus:border-[#123d35]"><optgroup label="Active owners">{options.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup><optgroup label="League alumni">{options.filter((item) => !item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup></select></label>;
}

function MomentCard({ label, game, reverse = false }: { label: string; game: VersusGame | null; reverse?: boolean }) {
  if (!game) return <div className="premium-panel rounded-lg p-5"><div className="kicker">{label}</div><p className="mt-4 text-sm text-[#766d61]">No result</p></div>;
  const first = reverse ? game.opponentScore : game.ownerScore;
  const second = reverse ? game.ownerScore : game.opponentScore;
  return <div className="premium-panel rounded-lg p-5"><div className="kicker">{label}</div><div className="mt-4 text-3xl font-black tabular-nums">{first.toFixed(1)}–{second.toFixed(1)}</div><p className="mt-2 text-xs font-semibold text-[#766d61]">{game.year} · Week {game.week}{game.isPlayoff ? " · Playoffs" : ""}</p></div>;
}
