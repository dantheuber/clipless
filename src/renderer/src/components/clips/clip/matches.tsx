import type { ReactNode } from 'react';
import type { Match, ScanResult } from '../../../../../shared/types';

export const ROW_TEXT_LIMIT = 2000;

export function markHits(text: string, term: string, keyPrefix: string): ReactNode[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [text];
  const pieces: ReactNode[] = [];
  const lower = text.toLowerCase();
  let from = 0;
  let at = lower.indexOf(needle, from);
  let n = 0;
  while (at >= 0) {
    if (at > from) pieces.push(text.slice(from, at));
    pieces.push(<mark key={`${keyPrefix}-${n++}`}>{text.slice(at, at + needle.length)}</mark>);
    from = at + needle.length;
    at = lower.indexOf(needle, from);
  }
  if (from < text.length) pieces.push(text.slice(from));
  return pieces;
}

export function visibleMatches(scan: ScanResult | null, limit: number): Match[] {
  if (!scan) return [];
  const kept: Match[] = [];
  let lastEnd = -1;
  for (const match of scan.matches) {
    if (match.start >= limit) break;
    if (match.start < lastEnd) continue;
    kept.push(match);
    lastEnd = match.end;
  }
  return kept;
}
