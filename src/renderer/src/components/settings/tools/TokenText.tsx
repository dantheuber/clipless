import classNames from 'classnames';
import type { SearchTerm } from '../../../../../shared/types';
import { useScanIndex } from '../../../providers/scan';
import { groupStyle } from './GroupPill';
import { groupState } from './model';
import type { Segment } from './resolve';
import styles from './Tools.module.css';

interface TokenTextProps {
  segments: Segment[];
  terms: readonly SearchTerm[];
  className?: string;
}

/**
 * A URL or template with its tokens shown: a resolved value in the group's colour, a token
 * with no sample value as a dashed token, an orphan token wavy red (spec 14.4), a
 * positional token grey.
 */
export function TokenText({ segments, terms, className }: TokenTextProps) {
  const { slotFor } = useScanIndex();
  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (segment.kind === 'text') return <span key={i}>{segment.text}</span>;
        if (segment.kind === 'value') {
          return (
            <span
              key={i}
              className={classNames(styles.token, styles.tokenValue)}
              style={groupStyle(slotFor(segment.group))}
              data-group={segment.group}
            >
              {segment.value}
            </span>
          );
        }
        if (segment.positional) {
          return (
            <span key={i} className={classNames(styles.token, styles.tokenPositional)}>
              {segment.token}
            </span>
          );
        }
        const orphan = segment.groups.every((g) => groupState(terms, g) === 'orphan');
        return (
          <span
            key={i}
            className={classNames(styles.token, { [styles.tokenOrphan]: orphan })}
            style={groupStyle(slotFor(segment.groups[0] ?? ''))}
            title={orphan ? 'no search term produces this' : 'no value in the sample'}
            data-orphan={orphan ? 'true' : undefined}
          >
            {segment.token}
          </span>
        );
      })}
    </span>
  );
}
