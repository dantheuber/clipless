import classNames from 'classnames';
import { useState } from 'react';
import { useStats } from './stats';
import { Panel } from './Row';
import { useSettingsStore } from './useSetting';
import { formatBytes } from './backup';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

export function Storage() {
  const { stats, refresh } = useStats();
  const { settings } = useSettingsStore();
  const [refreshed, setRefreshed] = useState(false);
  const max = settings?.maxClips ?? 0;
  const count = stats?.clipCount ?? 0;
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;

  const onRefresh = async () => {
    await refresh();
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1500);
  };

  return (
    <Panel title="Storage">
      <div className={styles.stack} data-testid="storage-panel">
        <div className={styles.line}>
          <span className={styles.num} data-testid="clip-count">
            {stats ? stats.clipCount : '–'}
          </span>
          <span className={styles.of}>of {max} clips</span>
          <span className={w.sp} />
          {refreshed && <span className={classNames(w.msg, w.msgOk)}>refreshed</span>}
          <button type="button" className={w.link} onClick={onRefresh} data-control>
            refresh
          </button>
        </div>
        <div className={styles.bar} role="progressbar" aria-valuenow={pct} aria-label="Clips used">
          <i className={classNames({ [styles.warn]: pct >= 90 })} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.sub}>
          <span>
            <b>{stats ? stats.lockedCount : '–'}</b> locked
          </span>
          <span>
            <b>{stats ? formatBytes(stats.dataSize) : '–'}</b> on disk
          </span>
        </div>
      </div>
    </Panel>
  );
}
