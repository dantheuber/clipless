import { useToast } from '../../Toast';
import { Pane } from '../shell/Pane';
import { Footer } from '../shell/Footer';
import { StatsProvider } from './stats';
import { Application } from './Application';
import { Window } from './Window';
import { Privacy } from './Privacy';
import { Storage } from './Storage';
import { Updates } from './Updates';
import { About } from './About';
import { ClearAll } from './ClearAll';
import { ImportPreview } from './ImportPreview';
import { backupFileName, formatBytes } from './backup';
import { errorText } from '../../../utils/errorText';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

/** Saves a backup; resolves to true only after the file was written. */
export async function exportData(toast: ReturnType<typeof useToast>): Promise<boolean> {
  try {
    const data = await window.api.storageExportData();
    const path = await window.api.saveTextFile(backupFileName(new Date()), data);
    if (!path) return false;
    toast('Saved', `${path} · ${formatBytes(new Blob([data]).size)}`);
    return true;
  } catch (error) {
    toast('Export failed', errorText(error));
    return false;
  }
}

/**
 * General (spec 15.4): Application beside Window and Privacy, three panels across the bottom, and
 * the rare data actions as footer links. Every control applies as it is changed.
 */
export function General() {
  const toast = useToast();

  const exportBackup = () => exportData(toast);

  return (
    <StatsProvider>
      <Pane
        title="General"
        footer={
          <Footer text="Changes apply as you make them.">
            <button
              type="button"
              className={w.link}
              onClick={exportBackup}
              data-testid="export-data"
            >
              export data
            </button>
            <ImportPreview />
            <ClearAll onExportFirst={exportBackup} />
          </Footer>
        }
      >
        <div className={styles.grid2} data-testid="general-grid">
          <Application />
          <div className={styles.windowAndPrivacy}>
            <Window />
            <Privacy />
          </div>
        </div>
        <div className={styles.grid3}>
          <Storage />
          <Updates />
          <About />
        </div>
      </Pane>
    </StatsProvider>
  );
}
