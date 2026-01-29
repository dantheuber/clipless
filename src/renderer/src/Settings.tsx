import classNames from 'classnames';
import { useState, useEffect } from 'react';
import UpdaterControl from './components/settings/UpdaterControl';
import Versions from './components/settings/Versions';
import { ClipsProvider } from './providers/clips';
import { ThemeProvider, useTheme } from './providers/theme';
import { LanguageDetectionProvider } from './providers/languageDetection';
import { StorageSettings } from './components/settings/StorageSettings';
import { UserSettings } from './components/settings/UserSettings';
import { ToolsManager } from './components/settings/ToolsManager';
import HotkeyManager from './components/settings/HotkeyManager';
import styles from './Settings.module.css';

type TabType = 'general' | 'tools' | 'hotkeys';

interface Tab {
  id: TabType;
  label: string;
  icon?: string;
}

const tabs: Tab[] = [
  { id: 'general', label: 'General' },
  { id: 'hotkeys', label: 'Hotkeys' },
  { id: 'tools', label: 'Tools' },
];

// Map legacy tab params to new tab
const TAB_PARAM_MAP: Record<string, TabType> = {
  general: 'general',
  hotkeys: 'hotkeys',
  tools: 'tools',
  templates: 'tools',
  quickClips: 'tools',
};

function SettingsContent(): React.JSX.Element {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Check for URL parameters to set initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      const mappedTab = TAB_PARAM_MAP[tabParam];
      if (mappedTab) {
        setActiveTab(mappedTab);
      }
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className={styles.grid}>
            {/* User Settings */}
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <UserSettings />
            </section>

            {/* App Updates Section */}
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <UpdaterControl />
            </section>

            {/* Storage Statistics and Data Management */}
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <StorageSettings />
            </section>

            {/* Version Information */}
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <Versions />
            </section>
          </div>
        );

      case 'tools':
        return (
          <div className={styles.grid}>
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <ToolsManager />
            </section>
          </div>
        );

      case 'hotkeys':
        return (
          <div className={styles.grid}>
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <HotkeyManager />
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={classNames(styles.container, { [styles.light]: isLight })}>
      {/* Tab Navigation */}
      <div className={classNames(styles.tabsContainer, { [styles.light]: isLight })}>
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={classNames(
                styles.tab,
                { [styles.tabActive]: activeTab === tab.id },
                { [styles.light]: isLight }
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className={styles.scrollContainer}>
        <div className={styles.content}>
          <LanguageDetectionProvider>
            <ClipsProvider>{renderTabContent()}</ClipsProvider>
          </LanguageDetectionProvider>
        </div>
      </div>
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <SettingsContent />
    </ThemeProvider>
  );
}

export default App;
