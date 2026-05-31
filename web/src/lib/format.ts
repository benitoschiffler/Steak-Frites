export const fmt = {
  pts: (n: number | null | undefined): string =>
    n == null ? '—' : n.toFixed(2),
  pts0: (n: number | null | undefined): string =>
    n == null ? '—' : n.toFixed(0),
  pct: (n: number | null | undefined): string =>
    n == null ? '—' : `${(n * 100).toFixed(1)}%`,
  record: (w: number, l: number, t: number): string =>
    t ? `${w}-${l}-${t}` : `${w}-${l}`,
  ordinal: (n: number | null | undefined): string => {
    if (n == null) return '—';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
  },
};

// Convert overall ADP (1.0 - 200ish) to a fantasy draft round for a league of N teams.
export function adpToRound(adp: number | null | undefined, teamCount: number): number | null {
  if (adp == null || adp <= 0) return null;
  return Math.max(1, Math.ceil(adp / teamCount));
}
