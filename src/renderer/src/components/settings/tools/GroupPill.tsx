import classNames from 'classnames';
import { useScanIndex } from '../../../providers/scan';
import type { GroupState } from './model';
import { groupStyle } from './groupStyle';
import styles from './Tools.module.css';

interface GroupPillProps {
  group: string;
  state?: GroupState;
  count?: number;
  big?: boolean;
  onClick?: (group: string, anchor: HTMLElement) => void;
  title?: string;
}

export function GroupPill({ group, state = 'ok', count, big, onClick, title }: GroupPillProps) {
  const { slotFor } = useScanIndex();
  const className = classNames(styles.pill, {
    [styles.pillOff]: state === 'off',
    [styles.pillOrphan]: state === 'orphan',
    [styles.pillBig]: big,
    [styles.pillButton]: Boolean(onClick),
  });
  const label =
    title ??
    (state === 'orphan'
      ? `No search term produces ${group}`
      : state === 'off'
        ? `Only a disabled search term produces ${group}`
        : group);
  const body = (
    <>
      {group}
      {count !== undefined && <span className={styles.pillCount}>{count}</span>}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={groupStyle(slotFor(group))}
        title={label}
        data-group={group}
        onClick={(e) => onClick(group, e.currentTarget)}
      >
        {body}
      </button>
    );
  }
  return (
    <span className={className} style={groupStyle(slotFor(group))} title={label} data-group={group}>
      {body}
    </span>
  );
}
