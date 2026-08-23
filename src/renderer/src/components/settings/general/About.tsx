import type { AppPathName } from '../../../../../shared/types';
import { useToast } from '../../Toast';
import { Panel } from './Row';
import { releaseNotesUrl } from './updateStatus';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

const PLATFORM_NAMES: Record<string, string> = {
  linux: 'Linux',
  win32: 'Windows',
  darwin: 'macOS',
};

export function platformLine(platform: string, arch: string): string {
  return `${PLATFORM_NAMES[platform] ?? platform} ${arch}`;
}

/**
 * About (spec 15.4): the version, the Electron and Chromium versions and the platform on
 * two short monospace lines, then release notes, data folder and log as links.
 */
export function About() {
  const toast = useToast();
  const versions = window.electron?.process?.versions ?? {};

  const open = async (name: AppPathName) => {
    const error = await window.api.openAppPath(name);
    if (error) toast('Could not open the folder', error);
  };

  return (
    <Panel title="About">
      <div className={styles.stack} data-testid="about-panel">
        <div className={styles.version}>Clipless {__APP_VERSION__}</div>
        <div className={styles.env}>
          Electron {versions.electron ?? '?'} · Chromium {versions.chrome ?? '?'}
          <br />
          {platformLine(window.api.platform, window.api.arch)}
        </div>
        <div className={styles.acts}>
          <button
            type="button"
            className={w.link}
            onClick={() => window.api.openExternalUrls([releaseNotesUrl(__APP_VERSION__)])}
            data-control
          >
            release notes
          </button>
          <button type="button" className={w.link} onClick={() => open('data')} data-control>
            data folder
          </button>
          <button type="button" className={w.link} onClick={() => open('logs')} data-control>
            log
          </button>
        </div>
      </div>
    </Panel>
  );
}
