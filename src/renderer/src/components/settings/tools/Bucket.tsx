import classNames from 'classnames';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { GroupColours } from '../../../../../shared/types';
import { DEFAULT_GROUP_SLOTS, GROUP_COLOUR_SLOTS } from '../../../../../shared/groupColours';
import { GroupPill } from './GroupPill';
import { groupStyle } from './groupStyle';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface BucketProps {
  group: string;

  others: readonly string[];
  slotFor: (group: string) => number;
  groupColours: GroupColours;
  anchor: HTMLElement;
  onPick: (slot: number | null) => void;
  onClose: () => void;
}

export function Bucket({
  group,
  others,
  slotFor,
  groupColours,
  anchor,
  onPick,
  onClose,
}: BucketProps) {
  const box = useRef<HTMLDivElement>(null);
  const current = slotFor(group);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const host = anchor.offsetParent as HTMLElement | null;
  const hostRect = host?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
  const rect = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left - hostRect.left, hostRect.width - 224));
  let top = rect.bottom - hostRect.top + 4;
  if (top + 130 > hostRect.height && rect.top - hostRect.top > 130)
    top = rect.top - hostRect.top - 130;
  const position: CSSProperties = { left, top };

  return (
    <div ref={box} className={styles.bucket} style={position} data-testid="bucket" role="dialog">
      <div className={styles.bucketHead}>
        Colour for <GroupPill group={group} />
      </div>
      <div className={styles.bucketGrid}>
        {GROUP_COLOUR_SLOTS.map((_, slot) => {
          const sharedWith = others.filter((other) => slotFor(other) === slot);
          return (
            <button
              key={slot}
              type="button"
              className={classNames(styles.slot, {
                [styles.slotCurrent]: slot === current,
                [styles.slotUsed]: sharedWith.length > 0,
              })}
              style={groupStyle(slot)}
              title={sharedWith.length ? `also used by ${sharedWith.join(', ')}` : 'free'}
              aria-label={`slot ${slot}`}
              data-slot={slot}
              data-shared={sharedWith.length ? sharedWith.join(',') : undefined}
              onClick={() => onPick(slot)}
            />
          );
        })}
      </div>
      <div className={styles.bucketFoot}>
        <span>
          {group in DEFAULT_GROUP_SLOTS ? 'default: prototype colour' : 'default: next free colour'}
        </span>
        <span className={w.sp} />
        <button
          type="button"
          className={w.link}
          disabled={!(group in groupColours)}
          onClick={() => onPick(null)}
        >
          reset
        </button>
      </div>
    </div>
  );
}
