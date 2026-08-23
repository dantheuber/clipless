import classNames from 'classnames';
import type { ReactNode } from 'react';
import type { ScanResult } from '../../../../../shared/types';
import { useScanIndex } from '../../../providers/scan';
import { visibleMatches } from '../../clips/clip/matches';
import { groupStyle } from './GroupPill';
import styles from './Tools.module.css';

interface ValueChipProps {
  group: string;
  value: string;
  /** A plain value chip (no +), for sample values in Uses and the overview */
  plain?: boolean;
  children?: ReactNode;
}

/**
 * A match as the clips window would draw it, in the group's colour, for previews. It is a
 * preview, so it pins nothing.
 */
export function ValueChip({ group, value, plain, children }: ValueChipProps) {
  const { slotFor } = useScanIndex();
  return (
    <span
      className={classNames(styles.chip, { [styles.chipValue]: plain })}
      style={groupStyle(slotFor(group))}
      data-group={group}
      data-value={value}
      title={group}
    >
      {children ?? value}
    </span>
  );
}

/**
 * The sample text with a chip on every match of the scan (spec 14.3): what the term under
 * edit would highlight, from the same scanText the rows use.
 */
export function ChipsPreview({ text, scan }: { text: string; scan: ScanResult }) {
  const pieces: ReactNode[] = [];
  let cursor = 0;
  visibleMatches(scan, text.length).forEach((match, i) => {
    if (match.start > cursor) pieces.push(text.slice(cursor, match.start));
    pieces.push(
      <ValueChip key={i} group={match.group} value={match.value}>
        {text.slice(match.start, match.end)}
      </ValueChip>
    );
    cursor = match.end;
  });
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return (
    <div className={styles.chips} data-testid="chips-preview">
      {pieces}
    </div>
  );
}
