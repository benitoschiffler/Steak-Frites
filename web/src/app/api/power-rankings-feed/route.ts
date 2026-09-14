import { loadPowerRankings } from '@/lib/data';

export const dynamic = 'force-static';

const HEADERS = [
  'team_id', 'owner_ids', 'owner', 'team_name', 'past_team_names', 'wins', 'losses', 'ties',
  'record', 'points_for', 'points_against', 'games', 'ppg', 'recent3_ppg', 'all_play_wins',
  'all_play_losses', 'all_play_pct', 'expected_wins', 'luck', 'median_win_pct', 'floor_score',
  'model_score', 'model_rank', 'previous_rank', 'movement', 'summary', 'season', 'week', 'status',
  'updated_at',
] as const;

function csv(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function GET() {
  const data = loadPowerRankings();
  const rows = data.rankings.map((row) => [
    row.team_id,
    (row.owner_ids ?? []).join(' | '),
    row.owner ?? row.owners.join(' & '),
    row.team_name,
    (row.past_team_names ?? []).join(' · '),
    row.wins,
    row.losses,
    row.ties,
    row.record,
    row.points_for,
    row.points_against,
    row.games,
    row.ppg,
    row.recent3_ppg,
    row.all_play_wins,
    row.all_play_losses,
    row.all_play_pct,
    row.expected_wins,
    row.luck,
    row.median_win_pct,
    row.floor_score,
    row.score,
    row.rank,
    row.previous_rank,
    row.movement,
    row.explanation,
    data.season,
    data.week,
    data.status,
    data.generated_at,
  ]);
  const body = [HEADERS, ...rows].map((row) => row.map(csv).join(',')).join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
