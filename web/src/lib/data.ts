// Server-only data loader. Reads JSON dumps from ../data/ at build time.
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AdpData, KeeperData, Meta, Owner, Records, Season,
} from './types';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data');

function readJson<T>(rel: string): T {
  const p = path.join(DATA_DIR, rel);
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

export function loadMeta(): Meta {
  return readJson<Meta>('meta.json');
}

export function loadOwners(): Owner[] {
  return readJson<Owner[]>('owners.json');
}

export function loadRecords(): Records {
  return readJson<Records>('records.json');
}

export function loadKeepers(): KeeperData {
  return readJson<KeeperData>('keepers.json');
}

export function loadAdp(): AdpData {
  return readJson<AdpData>('adp.json');
}

export function loadSeason(year: number): Season {
  return readJson<Season>(path.join('seasons', `${year}.json`));
}

export function loadAllSeasons(): Season[] {
  const meta = loadMeta();
  return meta.years.map(loadSeason);
}

// Helpers
export function ownerById(owners: Owner[], id: string | null | undefined): Owner | undefined {
  if (!id) return undefined;
  return owners.find((o) => o.owner_id === id);
}

export function ownerDisplay(owners: Owner[], id: string | null | undefined): string {
  return ownerById(owners, id)?.display_name ?? id ?? '—';
}
