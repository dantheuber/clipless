import { memo, type CSSProperties, type ReactNode } from 'react';
import classNames from 'classnames';
import { pinKey } from '../../../../../shared/readiness';
import { useClipsPins } from '../../../providers/clips';
import { useScanIndex } from '../../../providers/scan';
import styles from './Chip.module.css';

interface ChipProps {
  group: string;
  value: string;
  /** Rendered content; defaults to the value. The reader passes its syntax-coloured spans. */
  children?: ReactNode;
  /** "xN" when the value occurs more than once (side column) */
  count?: number;
  /** Outlined because the matching side column entry is hovered, or the reverse */
  lit?: boolean;
  onHover?: (key: string | null) => void;
  className?: string;
}

/**
 * The clickable rendering of a match (spec 4): dashed outline in the group's colour with a
 * "+" suffix; pinned is a solid outline with a tick. Click toggles the pin and never enters
 * edit; double-click selects the text for people who want a substring. Colour comes from
 * --slot-N through --gc, never a hex.
 */
export const Chip = memo(function Chip({
  group,
  value,
  children,
  count,
  lit,
  onHover,
  className,
}: ChipProps) {
  const { isPinned, togglePins } = useClipsPins();
  const { slotFor } = useScanIndex();
  const key = pinKey(group, value);
  const pinned = isPinned(key);

  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (event.detail >= 2) return; // the double-click selected text; leave the pin alone
    togglePins([key]);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(event.currentTarget);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  return (
    <span
      className={classNames(styles.chip, className, {
        [styles.pinned]: pinned,
        [styles.lit]: lit,
      })}
      style={{ '--gc': `var(--slot-${slotFor(group)})` } as CSSProperties}
      data-group={group}
      data-value={value}
      data-key={key}
      data-pinned={pinned ? 'true' : undefined}
      title={pinned ? `Unpin ${group} ${value}` : `Pin ${group} ${value}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={onHover ? () => onHover(key) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className={styles.text}>{children ?? value}</span>
      {count !== undefined && count > 1 && <span className={styles.count}>x{count}</span>}
    </span>
  );
});
