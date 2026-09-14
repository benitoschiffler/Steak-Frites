import 'server-only';

import { loadPowerRankings } from './data';
import type { PublishedPowerRanking } from './types';

const SHEET_ID = '18-2kfsfmkUnkmHSFqimlgOVYiCECCZ4GQWfSadLS2vM';
const SITE_EXPORT_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLbhBDXccxDKZgKQNRtB_7f1fO7SItDyCt-qDLQ04mEzRaJ6s7nhmdl4p8IyBAswD6mHo5h5Eut6HI/pub?gid=1142531984&single=true&output=csv';

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function number(value: string | undefined): number {
  const parsed = Number(value?.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: string | undefined): number {
  if (!value) return 0;
  return value.includes('%') ? number(value.replace('%', '')) / 100 : number(value);
}

function fallbackRows(): PublishedPowerRanking[] {
  const data = loadPowerRankings();
  return data.rankings.map((row) => ({
    rank: row.rank,
    owner: row.owner ?? row.owners.join(' & '),
    team_name: row.team_name,
    past_team_names: row.past_team_names ?? [],
    record: row.record,
    score: row.score,
    model_score: row.score,
    movement: row.movement ?? null,
    ppg: row.ppg ?? 0,
    recent3_ppg: row.recent3_ppg ?? 0,
    all_play_pct: row.all_play_pct ?? 0,
    luck: row.luck ?? 0,
    commentary: row.explanation,
    featured: false,
    team_id: row.team_id,
    status: data.status,
    week: data.week,
    updated_at: data.generated_at,
    source: 'model-fallback',
  }));
}

export async function loadPublishedPowerRankings(): Promise<PublishedPowerRanking[]> {
  try {
    const response = await fetch(SITE_EXPORT_URL, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`);
    const rows = parseCsv(await response.text());
    const headers = rows.shift() ?? [];
    const index = new Map(headers.map((header, i) => [header.trim(), i]));
    const get = (row: string[], key: string) => row[index.get(key) ?? -1] ?? '';
    const published = rows
      .filter((row) => get(row, 'owner') && get(row, 'rank'))
      .map((row): PublishedPowerRanking => ({
        rank: number(get(row, 'rank')),
        owner: get(row, 'owner'),
        team_name: get(row, 'team_name'),
        past_team_names: get(row, 'past_team_names').split(' · ').filter(Boolean),
        record: get(row, 'record'),
        score: number(get(row, 'score')),
        model_score: number(get(row, 'model_score')),
        movement: get(row, 'movement') === '' ? null : number(get(row, 'movement')),
        ppg: number(get(row, 'ppg')),
        recent3_ppg: number(get(row, 'recent3_ppg')),
        all_play_pct: percent(get(row, 'all_play_pct')),
        luck: number(get(row, 'luck')),
        commentary: get(row, 'commentary'),
        featured: get(row, 'featured').toLowerCase() === 'true',
        team_id: number(get(row, 'team_id')),
        status: get(row, 'status'),
        week: number(get(row, 'week')),
        updated_at: get(row, 'updated_at'),
        source: 'google-sheet',
      }))
      .sort((a, b) => a.rank - b.rank);
    return published.length ? published : fallbackRows();
  } catch {
    return fallbackRows();
  }
}

export const powerRankingsSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
