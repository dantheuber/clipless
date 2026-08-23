import { Fragment, type ReactNode } from 'react';
import type { Match, ScanResult } from '../../../../../shared/types';
import { Chip } from './Chip';

/** A row is one line; text past this is never visible, so it is not rendered */
export const ROW_TEXT_LIMIT = 2000;

interface CollapsedLineProps {
  text: string;
  scan: ScanResult | null;
  /** The search term, for soft marks on hits (spec 16 rule 2) */
  term?: string;
}

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

/**
 * The row's one line (spec 4): the text with a chip on every match and a mark on every
 * search hit. Whitespace collapses through white-space: nowrap, so positions stay those of
 * the original text.
 */
export function CollapsedLine({ text, scan, term = '' }: CollapsedLineProps) {
  const shown = text.length > ROW_TEXT_LIMIT ? text.slice(0, ROW_TEXT_LIMIT) : text;
  const pieces: ReactNode[] = [];
  let cursor = 0;
  visibleMatches(scan, shown.length).forEach((match, i) => {
    if (match.start > cursor) {
      pieces.push(
        <Fragment key={`t${i}`}>
          {markHits(shown.slice(cursor, match.start), term, `m${i}`)}
        </Fragment>
      );
    }
    const end = Math.min(match.end, shown.length);
    pieces.push(
      <Chip key={`c${i}`} group={match.group} value={match.value}>
        {shown.slice(match.start, end)}
      </Chip>
    );
    cursor = end;
  });
  if (cursor < shown.length) {
    pieces.push(<Fragment key="tail">{markHits(shown.slice(cursor), term, 'tail')}</Fragment>);
  }
  return <>{pieces}</>;
}
