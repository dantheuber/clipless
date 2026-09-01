import { useMemo, type CSSProperties } from 'react';
import classNames from 'classnames';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import { pinKey } from '../../../../shared/readiness';
import { useClipsPins } from '../../providers/clips';
import { useScanIndex } from '../../providers/scan';
import { Chip } from '../clips/clip/Chip';
import { formatBytes, imageBytes, imageFormat } from '../clips/clip/ImageClip';
import type { QuickLookView } from '../../providers/clips/quickLook';
import styles from './QuickLook.module.css';

interface SideColumnProps {
  clip: ClipItem;
  view: QuickLookView;
  scan: ScanResult | null;
  litKey: string | null;
  onHover: (key: string | null) => void;
  imageInfo: { width: number; height: number } | null;
  removed: Record<string, number> | null;
  /** Under 480px the column folds under the content as a strip that opens on click */
  folded: boolean;
  open: boolean;
  onToggle: () => void;
}

interface GroupEntry {
  group: string;
  values: { value: string; count: number }[];
}

/** Matches grouped by capture group in order of first appearance, each value once with its count */
export function groupMatches(scan: ScanResult | null): GroupEntry[] {
  if (!scan) return [];
  const groups: GroupEntry[] = [];
  for (const group of scan.groups) groups.push({ group, values: [] });
  for (const match of scan.matches) {
    const entry = groups.find((g) => g.group === match.group)!;
    const value = entry.values.find((v) => v.value === match.value);
    if (value) value.count++;
    else entry.values.push({ value: match.value, count: 1 });
  }
  return groups;
}

/**
 * The reader's right column (spec 5, 16 rule 6): matches grouped by capture group with a
 * count and a per-group pin all; for an image its format, pixels, size and where it is
 * stored; for the source view why there are no chips; for the rendered view what the
 * sanitiser removed.
 */
export function SideColumn({
  clip,
  view,
  scan,
  litKey,
  onHover,
  imageInfo,
  removed,
  folded,
  open,
  onToggle,
}: SideColumnProps) {
  const { isPinned, togglePins } = useClipsPins();
  const { slotFor } = useScanIndex();
  const groups = useMemo(() => groupMatches(scan), [scan]);
  const total = groups.reduce((n, g) => n + g.values.length, 0);

  let heading = 'Matches';
  let count = '';
  let body: React.ReactNode;

  if (clip.type === 'image') {
    heading = 'Image';
    const width = imageInfo?.width ?? clip.imageWidth;
    const height = imageInfo?.height ?? clip.imageHeight;
    const format = imageFormat(clip.thumbnailDataUrl || clip.content);
    body = (
      <div className={styles.kvList}>
        <div className={styles.kv}>format {format ? format.toLowerCase() : 'unknown'}</div>
        <div className={styles.kv}>
          {width && height ? `${width} x ${height} px` : 'size unknown'}
        </div>
        <div className={styles.kv}>{formatBytes(imageBytes(clip))}</div>
        <div className={styles.kv}>
          {clip.imageId ? 'stored in the image store, 200px thumbnail' : 'stored inline'}
        </div>
        <div className={styles.none}>No chips, no pins: images are not scanned.</div>
      </div>
    );
  } else if (view === 'source') {
    heading = 'Source';
    body = (
      <div className={styles.none}>
        The source view has no chips. Switch to text to pin values from the extracted text.
      </div>
    );
  } else if (view === 'rendered') {
    heading = 'Rendered';
    const entries = removed ? Object.entries(removed) : [];
    body = removed ? (
      <div className={styles.kvList}>
        <div className={styles.kv}>
          {entries.length === 0
            ? 'nothing removed'
            : `removed: ${entries.map(([k, v]) => (v > 1 ? `${k} x${v}` : k)).join(', ')}`}
        </div>
        <div className={styles.none}>
          Links are inert here; the URL is a chip in the text view and goes through the tray.
        </div>
      </div>
    ) : (
      <div className={styles.none}>Sanitising…</div>
    );
  } else if (scan === null) {
    body = <div className={styles.none}>Scanning this clip…</div>;
  } else if (total === 0) {
    body = <div className={styles.none}>No search terms match this clip.</div>;
  } else {
    count = `${total} ${total === 1 ? 'value' : 'values'}`;
    body = groups.map(({ group, values }) => {
      const keys = values.map((v) => pinKey(group, v.value));
      const allPinned = keys.every(isPinned);
      return (
        <div
          key={group}
          className={styles.group}
          style={{ '--gc': `var(--slot-${slotFor(group)})` } as CSSProperties}
          data-testid={`ql-group-${group}`}
        >
          <div className={styles.groupHeader}>
            <i className={styles.swatch} />
            <span>{group}</span>
            <span className={styles.groupCount}>{values.length}</span>
            <span className={styles.spacer} />
            <button
              type="button"
              className={styles.groupPin}
              onClick={() => togglePins(keys)}
              title={
                allPinned ? `Unpin every ${group} in this clip` : `Pin every ${group} in this clip`
              }
            >
              {allPinned ? 'unpin all' : 'pin all'}
            </button>
          </div>
          {values.map(({ value, count: n }) => (
            <div key={value} className={styles.groupItem}>
              <Chip
                group={group}
                value={value}
                count={n}
                lit={litKey === pinKey(group, value)}
                onHover={onHover}
                tabbable
                className={styles.sideChip}
              />
            </div>
          ))}
        </div>
      );
    });
  }

  return (
    <div
      className={classNames(styles.side, {
        [styles.folded]: folded,
        [styles.closed]: folded && !open,
      })}
      data-testid="ql-side"
    >
      <div
        className={styles.sideHeader}
        onClick={folded ? onToggle : undefined}
        role={folded ? 'button' : undefined}
        aria-expanded={folded ? open : undefined}
      >
        <span>{heading}</span>
        <span className={styles.spacer} />
        <span>{count}</span>
      </div>
      {(!folded || open) && <div className={styles.sideList}>{body}</div>}
    </div>
  );
}
