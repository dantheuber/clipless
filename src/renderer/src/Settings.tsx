import { useEffect, useState } from 'react';
import { ScanIndexProvider } from './providers/scan';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './providers/theme';
import { SettingsProvider } from './components/settings/general/SettingsProvider';
import { useSettingsStore } from './components/settings/general/useSetting';
import { Rail, type SettingsTab } from './components/settings/shell/Rail';
import { General } from './components/settings/general/General';
import { Hotkeys } from './components/settings/hotkeys/Hotkeys';
import { Tools } from './components/settings/tools/Tools';
import styles from './components/settings/shell/Shell.module.css';
import w from './components/settings/shell/widgets.module.css';

const TAB_PARAM_MAP: Record<string, SettingsTab> = {
  general: 'general',
  hotkeys: 'hotkeys',
  tools: 'tools',
  templates: 'tools',
  quickClips: 'tools',
};

function initialTab(): SettingsTab {
  const param = new URLSearchParams(window.location.search).get('tab');
  return (param && TAB_PARAM_MAP[param]) || 'general';
}

function SettingsShell(): React.JSX.Element {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const { settings, loadError, reload } = useSettingsStore();

  useEffect(() => {
    document.title = 'Clipless settings';
  }, []);

  let pane: React.ReactNode;
  if (loadError) {
    pane = (
      <div className={styles.loadError} data-testid="load-error">
        Settings did not load: {loadError}.
        <button type="button" className={w.link} onClick={reload}>
          retry
        </button>
      </div>
    );
  } else if (!settings) {
    pane = <div className={styles.loading}>Loading</div>;
  } else if (tab === 'general') {
    pane = <General />;
  } else if (tab === 'hotkeys') {
    pane = <Hotkeys />;
  } else {
    pane = <Tools />;
  }

  return (
    <div className={styles.shell}>
      <Rail active={tab} onSelect={setTab} version={__APP_VERSION__} />
      {pane}
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SettingsProvider>
          <ScanIndexProvider>
            <SettingsShell />
          </ScanIndexProvider>
        </SettingsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
