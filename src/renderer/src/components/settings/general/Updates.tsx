import classNames from 'classnames';
import { useEffect, useState } from 'react';
import type { UpdateState } from '../../../../../shared/types';
import { useToast } from '../../Toast';
import { Dot } from '../shell/Dot';
import { Panel, ToggleRow } from './Row';
import { RELEASES_URL, updateView } from './updateStatus';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

/**
 * Updates (spec 15.4): the Check on start toggle, a status line driven by the updater's
 * state enum, then Check now, replaced by Restart and install once a download has landed.
 * macOS shows a releases link instead of a button.
 */
export function Updates() {
  const toast = useToast();
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    window.api
      .getUpdateState()
      .then(setState)
      .catch((error) => console.error('Failed to read update state:', error));
    return window.api.onUpdateState(setState);
  }, []);

  const view = updateView(state, __APP_VERSION__, window.api.platform);

  const check = async () => {
    try {
      const result = await window.api.checkForUpdates();
      if (result) await window.api.downloadUpdate();
    } catch (error) {
      // The main process has set the error state; nothing else to say here
      console.error('Update check failed:', error);
    }
  };

  const install = async () => {
    toast('Restarting', `to install ${state.version ?? 'the update'}`);
    try {
      await window.api.quitAndInstall();
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  const releases = async () => {
    await window.api.openExternalUrls([RELEASES_URL]);
  };

  return (
    <Panel title="Updates">
      <ToggleRow
        id="automaticUpdates"
        label="Check on start"
        description="Check in the background when Clipless starts; you are asked before a restart."
        tight
      />
      <div className={styles.stack} data-testid="updates-panel">
        <div className={styles.statusLine}>
          <Dot kind={view.dot} className={styles.dot} />
          <span className={styles.statusText}>
            <span data-testid="update-head">{view.head}</span>
            {view.detail && <div className={styles.detail}>{view.detail}</div>}
          </span>
        </div>
        <div className={styles.acts}>
          {view.releases && (
            <button type="button" className={w.link} onClick={releases} data-control>
              get the latest from releases
            </button>
          )}
          {view.button === 'check' && (
            <button
              type="button"
              className={classNames(w.btn, w.sm)}
              disabled={view.busy}
              onClick={check}
              data-control
            >
              Check now
            </button>
          )}
          {view.button === 'install' && (
            <button
              type="button"
              className={classNames(w.btn, w.sm, w.primary)}
              onClick={install}
              data-control
            >
              Restart and install
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
