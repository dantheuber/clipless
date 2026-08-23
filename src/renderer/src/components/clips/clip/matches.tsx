import type { ReactNode } from 'react';
import type { Match, ScanResult } from '../../../../../shared/types';

/**
 * Pure helpers over a scan for anything that draws chips: the clip rows, the reader and
 * the settings previews. Kept apart from the row components so the settings window can
 * import them without pulling in the clips provider.
 */

/**
 * Mark every case-insensitive occurrence of the term in a plain piece of text. Hits are a
 * mark, never a chip; chips stay chips.
 */
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

/**
 * The non-overlapping matches that start before the limit; the earlier of two overlapping
 * matches wins (spec 17.3).
 */
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
