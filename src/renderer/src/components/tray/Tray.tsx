import { useMemo, useState, type CSSProperties } from 'react';
import classNames from 'classnames';
import { useClipsPins } from '../../providers/clips';
import { useScanIndex } from '../../providers/scan';
import { useToast, type ToastFn } from '../Toast';
import { NARROW_WINDOW, SHORT_WINDOW, useMediaQuery } from '../../hooks/useMediaQuery';
import { useToolUrls } from './useToolUrls';
import { TrayGroup } from './TrayGroup';
import { TrayFooter } from './TrayFooter';
import styles from './Tray.module.css';

/**
 * Open the tabs a tool or the tray produces through the main process, which accepts http
 * and https only. Every control states its count before it is clicked (spec 6).
 */
export async function openTabs(urls: string[], toast: ToastFn): Promise<void> {
  if (urls.length === 0) return;
  try {
    const opened = await window.api.openExternalUrls(urls);
    toast(`Opened ${opened} ${opened === 1 ? 'tab' : 'tabs'}`, urls);
  } catch (error) {
    console.error('Failed to open tabs:', error);
    toast('Could not open the tabs', String(error));
  }
}

export const tabCount = (n: number): string => `${n} ${n === 1 ? 'tab' : 'tabs'}`;

/**
 * The launch tray under the list (spec 6, 16 rule 1): hidden until something is pinned,
 * one row per capture group, tool buttons with multipliers, Open all with the exact count.
 * Under 360px tall or 480px wide it opens collapsed to one line.
 */
export function Tray() {
  const { pins, pinsByGroup, setPins, clearPins, droppedNotice, dismissDroppedNotice } =
    useClipsPins();
  const { slotFor } = useScanIndex();
  const toast = useToast();
  const short = useMediaQuery(SHORT_WINDOW);
  const narrow = useMediaQuery(NARROW_WINDOW);
  const small = short || narrow;
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const collapsed = userOpen === null ? small : !userOpen;
  const { allUrls, toolsFor } = useToolUrls();

  const groups = useMemo(() => Object.keys(pinsByGroup), [pinsByGroup]);
  const total = pins.size;

  if (total === 0 && !droppedNotice) return null;

  const summary = groups
    .map((g) => (pinsByGroup[g].length > 1 ? `${g} x${pinsByGroup[g].length}` : g))
    .join(', ');
  const openAll = (
    <button
      type="button"
      className={styles.primary}
      onClick={() => openTabs(allUrls, toast)}
      disabled={allUrls.length === 0}
      data-testid="open-all"
    >
      Open all ({tabCount(allUrls.length)})
    </button>
  );

  return (
    <div className={classNames(styles.tray, { [styles.collapsed]: collapsed })} data-testid="tray">
      {droppedNotice && (
        <div className={styles.notice} data-testid="tray-notice">
          {droppedNotice}{' '}
          <button type="button" className={styles.link} onClick={dismissDroppedNotice}>
            dismiss
          </button>
        </div>
      )}
      {total > 0 && collapsed && (
        <div className={styles.summary}>
          <b>Launch tray</b>
          <span className={styles.ellipsis}>
            {total} {total === 1 ? 'value' : 'values'}: {summary}
          </span>
          <span className={styles.spacer} />
          {openAll}
          <button type="button" className={styles.link} onClick={() => setUserOpen(true)}>
            expand
          </button>
        </div>
      )}
      {total > 0 && !collapsed && (
        <>
          <div className={styles.header}>
            <b>Launch tray</b>
            <span>
              {total} {total === 1 ? 'value' : 'values'}
            </span>
            <span className={styles.spacer} />
            {(small || userOpen !== null) && (
              <button type="button" className={styles.link} onClick={() => setUserOpen(false)}>
                collapse
              </button>
            )}
            <button
              type="button"
              className={styles.link}
              onClick={clearPins}
              data-testid="tray-clear"
            >
              clear
            </button>
          </div>
          {groups.map((group) => (
            <TrayGroup
              key={group}
              group={group}
              values={pinsByGroup[group]}
              tools={toolsFor(group)}
              pinsByGroup={pinsByGroup}
              style={{ '--gc': `var(--slot-${slotFor(group)})` } as CSSProperties}
              onRemove={(value) => setPins([`${group}|${value}`], false)}
              onOpen={(urls) => openTabs(urls, toast)}
            />
          ))}
          <TrayFooter openAll={openAll} />
        </>
      )}
    </div>
  );
}
