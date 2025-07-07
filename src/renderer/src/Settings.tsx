import classNames from 'classnames'
import { useState, useEffect } from 'react'
import UpdaterControl from './components/settings/UpdaterControl'
import Versions from './components/settings/Versions'
import { ClipsProvider } from './providers/clips'
import { ThemeProvider, useTheme } from './providers/theme'
import { LanguageDetectionProvider } from './providers/languageDetection'
import { StorageSettings } from './components/settings/StorageSettings'
import { UserSettings } from './components/settings/UserSettings'
import { TemplateManager } from './components/settings/TemplateManager'
import styles from './Settings.module.css'

type TabType = 'general' | 'templates' | 'quickClips'

interface Tab {
  id: TabType
  label: string
  icon?: string
}

const tabs: Tab[] = [
  { id: 'general', label: 'General' },
  { id: 'templates', label: 'Templates' },
  { id: 'quickClips', label: 'Quick Clips' }
]

function SettingsContent(): React.JSX.Element {
  const { isLight } = useTheme()
  const [activeTab, setActiveTab] = useState<TabType>('general')

  // Check for URL parameters to set initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab') as TabType
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

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
        )

      case 'templates':
        return (
          <div className={styles.grid}>
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <TemplateManager />
            </section>
          </div>
        )

      case 'quickClips':
        return (
          <div className={styles.grid}>
            <section className={classNames(styles.section, { [styles.light]: isLight })}>
              <h2 className={styles.sectionTitle}>Quick Clips</h2>
              <p className={styles.placeholder}>
                Quick Clips settings will be available here. This will allow you to configure 
                frequently used clipboard items for quick access.
              </p>
            </section>
          </div>
        )

      default:
        return null
    }
  }

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
            <ClipsProvider>
              {renderTabContent()}
            </ClipsProvider>
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

export default App
