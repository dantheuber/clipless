import { Fragment, type ReactNode } from 'react';
import type { ScanResult } from '../../../../../shared/types';
import { Chip } from './Chip';
import { ROW_TEXT_LIMIT, markHits, visibleMatches } from './matches';

interface CollapsedLineProps {
  text: string;
  scan: ScanResult | null;

  term?: string;
}

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
