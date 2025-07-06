import classNames from 'classnames'
import UpdaterControl from './components/settings/UpdaterControl'
import Versions from './components/settings/Versions'
import { ClipsProvider } from './providers/clips'
import { ThemeProvider, useTheme } from './providers/theme'
import { LanguageDetectionProvider } from './providers/languageDetection'
import { StorageSettings } from './components/settings/StorageSettings'
import { UserSettings } from './components/settings/UserSettings'
import styles from './Settings.module.css'

function SettingsContent(): React.JSX.Element {
  const { isLight } = useTheme()

  return (
    <div className={classNames(styles.container, { [styles.light]: isLight })}>
      <div className={styles.scrollContainer}>
        <div className={styles.content}>
          <LanguageDetectionProvider>
            <ClipsProvider>
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
