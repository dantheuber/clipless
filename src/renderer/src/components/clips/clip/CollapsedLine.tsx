import { Fragment, type ReactNode } from 'react';
import type { ScanResult } from '../../../../../shared/types';
import { Chip } from './Chip';
import { markHits, visibleMatches } from './matches';

export { markHits, visibleMatches } from './matches';

/** A row is one line; text past this is never visible, so it is not rendered */
export const ROW_TEXT_LIMIT = 2000;

interface CollapsedLineProps {
  text: string;
  scan: ScanResult | null;
  /** The search term, for soft marks on hits (spec 16 rule 2) */
  term?: string;
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
