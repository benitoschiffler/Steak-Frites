import type { Owner, Season } from "./types";

export type VersusGame = {
  year: number; week: number; ownerScore: number; opponentScore: number;
  ownerTeam: string; opponentTeam: string; isPlayoff: boolean;
};

export type VersusRecord = {
  ownerId: string; opponentId: string; wins: number; losses: number; ties: number;
  pointsFor: number; pointsAgainst: number; playoffWins: number; playoffLosses: number;
  currentStreak: string; biggestWin: VersusGame | null; biggestLoss: VersusGame | null;
  closestGame: VersusGame | null; highestScoringGame: VersusGame | null; games: VersusGame[];
};

export function buildVersusRecords(seasons: Season[], owners: Owner[], excludedYears: Set<number>): VersusRecord[] {
  const canonical = new Set(owners.map((owner) => owner.owner_id));
  const gamesByPair = new Map<string, VersusGame[]>();
  for (const season of seasons) {
    if (excludedYears.has(season.year)) continue;
    const teams = new Map(season.teams.map((team) => [team.team_id, team]));
    for (const matchup of season.matchups) {
      if (matchup.home_score == null || matchup.away_score == null || matchup.home_team_id == null || matchup.away_team_id == null) continue;
      if (matchup.home_score <= 0 && matchup.away_score <= 0) continue;
      const home = teams.get(matchup.home_team_id);
      const away = teams.get(matchup.away_team_id);
      if (!home || !away) continue;
      const homeOwners = [...new Set(home.owner_ids)].filter((id) => canonical.has(id));
      const awayOwners = [...new Set(away.owner_ids)].filter((id) => canonical.has(id));
      for (const ownerId of homeOwners) for (const opponentId of awayOwners) {
        const key = `${ownerId}::${opponentId}`;
        const reverseKey = `${opponentId}::${ownerId}`;
        const game = { year: season.year, week: matchup.week, ownerScore: matchup.home_score, opponentScore: matchup.away_score, ownerTeam: home.name, opponentTeam: away.name, isPlayoff: matchup.is_playoff };
        const reverse = { ...game, ownerScore: game.opponentScore, opponentScore: game.ownerScore, ownerTeam: game.opponentTeam, opponentTeam: game.ownerTeam };
        gamesByPair.set(key, [...(gamesByPair.get(key) ?? []), game]);
        gamesByPair.set(reverseKey, [...(gamesByPair.get(reverseKey) ?? []), reverse]);
      }
    }
  }
  return [...gamesByPair.entries()].map(([key, games]) => {
    const [ownerId, opponentId] = key.split("::");
    const sorted = [...games].sort((a, b) => a.year - b.year || a.week - b.week);
    const wins = games.filter((g) => g.ownerScore > g.opponentScore).length;
    const losses = games.filter((g) => g.ownerScore < g.opponentScore).length;
    const ties = games.length - wins - losses;
    const winnerGames = games.filter((g) => g.ownerScore > g.opponentScore);
    const loserGames = games.filter((g) => g.ownerScore < g.opponentScore);
    const lastResult = sorted.at(-1);
    let streakCount = 0;
    const streakKind = !lastResult ? "" : lastResult.ownerScore > lastResult.opponentScore ? "W" : lastResult.ownerScore < lastResult.opponentScore ? "L" : "T";
    for (const game of [...sorted].reverse()) {
      const result = game.ownerScore > game.opponentScore ? "W" : game.ownerScore < game.opponentScore ? "L" : "T";
      if (result !== streakKind) break;
      streakCount++;
    }
    return {
      ownerId, opponentId, wins, losses, ties,
      pointsFor: games.reduce((sum, g) => sum + g.ownerScore, 0),
      pointsAgainst: games.reduce((sum, g) => sum + g.opponentScore, 0),
      playoffWins: games.filter((g) => g.isPlayoff && g.ownerScore > g.opponentScore).length,
      playoffLosses: games.filter((g) => g.isPlayoff && g.ownerScore < g.opponentScore).length,
      currentStreak: `${streakKind}${streakCount}`,
      biggestWin: winnerGames.sort((a, b) => (b.ownerScore - b.opponentScore) - (a.ownerScore - a.opponentScore))[0] ?? null,
      biggestLoss: loserGames.sort((a, b) => (a.ownerScore - a.opponentScore) - (b.ownerScore - b.opponentScore))[0] ?? null,
      closestGame: [...games].sort((a, b) => Math.abs(a.ownerScore - a.opponentScore) - Math.abs(b.ownerScore - b.opponentScore))[0] ?? null,
      highestScoringGame: [...games].sort((a, b) => (b.ownerScore + b.opponentScore) - (a.ownerScore + a.opponentScore))[0] ?? null,
      games: sorted.reverse(),
    };
  });
}
