import { useToast } from '../../Toast';
import { Pane } from '../shell/Pane';
import { Footer } from '../shell/Footer';
import { StatsProvider } from './stats';
import { Application } from './Application';
import { Window } from './Window';
import { Storage } from './Storage';
import { Updates } from './Updates';
import { About } from './About';
import { ClearAll } from './ClearAll';
import { ImportPreview } from './ImportPreview';
import { backupFileName, downloadText, formatBytes } from './backup';
import { errorText } from '../shell/errorText';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

/**
 * General (spec 15.4): two panels side by side, three short panels across the bottom, and
 * the rare data actions as footer links. Every control applies as it is changed.
 */
export function General() {
  const toast = useToast();

  const exportData = async () => {
    try {
      const data = await window.api.storageExportData();
      const name = backupFileName(new Date());
      const size = downloadText(name, data);
      toast('Saved', `${name} · ${formatBytes(size)}`);
    } catch (error) {
      toast('Export failed', errorText(error));
    }
  };

  return (
    <StatsProvider>
      <Pane
        title="General"
        footer={
          <Footer text="Changes apply as you make them.">
            <button type="button" className={w.link} onClick={exportData} data-testid="export-data">
              export data
            </button>
            <ImportPreview />
            <ClearAll onExportFirst={exportData} />
          </Footer>
        }
      >
        <div className={styles.grid2} data-testid="general-grid">
          <Application />
          <Window />
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
