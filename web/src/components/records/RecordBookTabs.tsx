"use client";

import { useRef, useState } from "react";
import type { PlayerPerformance, Records } from "@/lib/types";
import { Section } from "@/components/Section";
import MatchupTable from "./MatchupTable";
import PlayerRecordTable from "./PlayerRecordTable";
import SeasonTable from "./SeasonTable";
import StreakTable from "./StreakTable";
import TeamGameTable from "./TeamGameTable";

const TABS = [
  { id: "week-one", label: "Week 1", description: "Opening-week highs and lows" },
  { id: "single-week", label: "Single Week", description: "Regular-season game records" },
  { id: "playoffs", label: "Playoffs", description: "Winners-bracket performances" },
  { id: "championship", label: "Championship", description: "Title-game history" },
  { id: "nfl-players", label: "NFL Players", description: "Starter and bench explosions" },
  { id: "seasons", label: "Seasons", description: "Full-season marks and streaks" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type RecordBookData = Pick<
  Records,
  | "opening_week_highest"
  | "opening_week_lowest"
  | "game_records"
  | "highest_season_pf"
  | "lowest_season_pf"
  | "best_season_ppg"
  | "worst_season_ppg"
  | "streaks"
>;

type PlayerRecords = {
  openingWeek: PlayerPerformance[];
  benchScores: PlayerPerformance[];
  carryJobs: PlayerPerformance[];
};

export default function RecordBookTabs({
  records,
  players,
}: {
  records: RecordBookData;
  players: PlayerRecords;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("week-one");
  const tabListRef = useRef<HTMLDivElement>(null);
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  function moveFocus(currentIndex: number, direction: -1 | 1) {
    const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
    const next = TABS[nextIndex];
    setActiveTab(next.id);
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    buttons?.[nextIndex]?.focus();
  }

  return (
    <div className="space-y-7">
      <div className="premium-panel overflow-hidden rounded-xl">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Record Book categories"
          className="flex gap-1 overflow-x-auto border-b border-black/10 p-2"
        >
          {TABS.map((tab, index) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                id={`record-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="record-tab-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveFocus(index, 1);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveFocus(index, -1);
                  }
                }}
                className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a22] ${
                  selected
                    ? "bg-[#123d35] text-[#fffaf0] shadow-sm"
                    : "text-[#5b554c] hover:bg-[#123d35]/[0.07] hover:text-[#123d35]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1 bg-[#123d35]/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-black text-[#123d35]">{active.label} records</div>
          <div className="text-xs font-semibold text-[#766d61]">{active.description}</div>
        </div>
      </div>

      <div
        id="record-tab-panel"
        role="tabpanel"
        aria-labelledby={`record-tab-${activeTab}`}
        className="space-y-10"
      >
        {activeTab === "week-one" && (
          <Section
            eyebrow="Opening Bell"
            title="Week 1 extremes"
            subtitle="The hottest and coldest team starts in league history."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <TeamGameTable rows={records.opening_week_highest} title="Highest opening-week team scores" />
              <TeamGameTable rows={records.opening_week_lowest} title="Lowest opening-week team scores" defaultDir="asc" />
            </div>
          </Section>
        )}

        {activeTab === "single-week" && (
          <GameRecordSections records={records.game_records.regular_season} context="regular season" />
        )}

        {activeTab === "playoffs" && (
          <GameRecordSections records={records.game_records.playoffs} context="playoff" />
        )}

        {activeTab === "championship" && (
          <GameRecordSections records={records.game_records.championships} context="championship" />
        )}

        {activeTab === "nfl-players" && (
          <>
            <Section
              eyebrow="NFL Players"
              title="Opening-week explosions"
              subtitle="The biggest Week 1 performances by players in a starting lineup."
            >
              <PlayerRecordTable rows={players.openingWeek} title="Highest opening-week player scores" />
            </Section>
            <Section
              eyebrow="Lineup Decisions"
              title="Bench nightmares and carry jobs"
              subtitle="The eruptions stranded on the bench, and the starters who supplied the biggest share of a team score."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <PlayerRecordTable rows={players.benchScores} title="Most points left on the bench" />
                <PlayerRecordTable rows={players.carryJobs} title="Biggest one-player carry jobs" metric="share" />
              </div>
            </Section>
          </>
        )}

        {activeTab === "seasons" && (
          <>
            <Section
              eyebrow="Season Marks"
              title="Single-season records"
              subtitle="The best and worst regular seasons by total points and points per game."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SeasonTable rows={records.highest_season_pf} title="Highest season points" valueKey="points_for" />
                <SeasonTable rows={records.lowest_season_pf} title="Lowest season points" valueKey="points_for" defaultDir="asc" />
                <SeasonTable rows={records.best_season_ppg} title="Best season PPG" valueKey="ppg" />
                <SeasonTable rows={records.worst_season_ppg} title="Worst season PPG" valueKey="ppg" defaultDir="asc" />
              </div>
            </Section>
            <Section eyebrow="Momentum" title="Streaks" subtitle="The longest runs of consecutive wins and losses.">
              <div className="grid gap-4 md:grid-cols-2">
                <StreakTable title="Longest winning streaks" rows={records.streaks} kind="win" />
                <StreakTable title="Longest losing streaks" rows={records.streaks} kind="loss" />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function GameRecordSections({
  records,
  context,
}: {
  records: Records["game_records"][keyof Records["game_records"]];
  context: "regular season" | "playoff" | "championship";
}) {
  const label = context === "regular season" ? "regular-season" : context;
  const eyebrow = context === "regular season" ? "Single Week" : context === "playoff" ? "Postseason" : "Title Games";

  return (
    <>
      <Section
        eyebrow={eyebrow}
        title={`${capitalize(context)} team scores`}
        subtitle={`The highest and lowest single-team scores in ${label} games.`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamGameTable rows={records.highest_scores} title={`Highest ${label} team scores`} />
          <TeamGameTable rows={records.lowest_scores} title={`Lowest ${label} team scores`} defaultDir="asc" />
        </div>
      </Section>

      <Section
        eyebrow="Pain & Fortune"
        title="Heartbreak and lucky escapes"
        subtitle={`The most points scored in a ${label} loss, and the fewest points that still produced a win.`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamGameTable rows={records.highest_losing_scores} title={`Highest ${label} scores in a loss`} />
          <TeamGameTable rows={records.lowest_winning_scores} title={`Lowest ${label} scores in a win`} defaultDir="asc" />
        </div>
      </Section>

      <Section eyebrow="Game Drama" title="Margin of victory" subtitle={`The widest and narrowest decided ${label} games.`}>
        <div className="grid gap-4 lg:grid-cols-2">
          <MatchupTable rows={records.biggest_blowouts} title={`Biggest ${label} blowouts`} valueKey="margin" />
          <MatchupTable rows={records.closest_games} title={`Closest ${label} games`} valueKey="margin" defaultDir="asc" />
        </div>
      </Section>

      <Section eyebrow="Game Totals" title="Combined scores" subtitle={`The highest- and lowest-scoring ${label} matchups.`}>
        <div className="grid gap-4 lg:grid-cols-2">
          <MatchupTable rows={records.highest_combined} title={`Highest combined ${label} scores`} valueKey="combined" />
          <MatchupTable rows={records.lowest_combined} title={`Lowest combined ${label} scores`} valueKey="combined" defaultDir="asc" />
        </div>
      </Section>
    </>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
