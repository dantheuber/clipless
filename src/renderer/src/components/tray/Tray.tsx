import { useMemo, useState, type CSSProperties } from 'react';
import classNames from 'classnames';
import { useClipsPins } from '../../providers/clips';
import { useScanIndex } from '../../providers/scan';
import { useToast } from '../useToast';
import { NARROW_WINDOW, SHORT_WINDOW, useMediaQuery } from '../../hooks/useMediaQuery';
import { useToolUrls } from './useToolUrls';
import { TrayGroup } from './TrayGroup';
import { TrayFooter } from './TrayFooter';
import { openTabs, tabCount } from './openTabs';
import styles from './Tray.module.css';
import { CompactPrimaryButton } from '../CompactPrimaryButton';

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
    <CompactPrimaryButton
      onClick={() => openTabs(allUrls, toast)}
      disabled={allUrls.length === 0}
      testId="open-all"
    >
      Open all ({tabCount(allUrls.length)})
    </CompactPrimaryButton>
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
