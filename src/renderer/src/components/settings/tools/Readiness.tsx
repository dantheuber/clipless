import classNames from 'classnames';
import type { ScanResult, SearchTerm } from '../../../../../shared/types';
import {
  itemTokens,
  readinessText,
  sampleReadiness,
  type ConfigItem,
} from '../../../../../shared/readiness';
import { GroupPill } from './GroupPill';
import { groupState } from './model';
import styles from './Tools.module.css';

interface ReadinessProps {
  item: ConfigItem;
  terms: readonly SearchTerm[];
  scan: ScanResult;
}

const CLASS = {
  never: styles.readyOrph,
  disabled: styles.readyNo,
  sample: styles.readySample,
  ready: styles.readyOk,
};

/**
 * The readiness line (spec 14.4): one of four wordings that never merge, with the pills of
 * every group the item needs.
 */
export function Readiness({ item, terms, scan }: ReadinessProps) {
  const tokens = itemTokens(item);
  if (tokens.length === 0) {
    return (
      <span className={styles.ready} data-testid="readiness">
        <b>no tokens</b> opens as it is
      </span>
    );
  }
  const readiness = sampleReadiness(item, terms, scan);
  const groups: string[] = [];
  for (const token of tokens) for (const g of token.groups) if (!groups.includes(g)) groups.push(g);
  return (
    <span
      className={classNames(styles.ready, CLASS[readiness.level])}
      data-testid="readiness"
      data-level={readiness.level}
    >
      <b>{readinessText(readiness)}</b>
      <span>needs</span>
      {groups.map((g) => (
        <GroupPill key={g} group={g} state={groupState(terms, g)} />
      ))}
    </span>
  );
}
