import UpdaterControl from './components/settings/UpdaterControl'
import Versions from './components/settings/Versions'
import { ClipsProvider } from './providers/clips'
import { StorageSettings } from './components/settings/StorageSettings'
import styles from './Settings.module.css'

function App(): React.JSX.Element {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : ''}`}>
      <div className={styles.scrollContainer}>
        <div className={styles.content}>
          <ClipsProvider>
            <div className={styles.grid}>
              {/* Storage Settings Section */}
              <section className={`${styles.section} ${isDark ? styles.dark : ''}`}>
                <StorageSettings />
              </section>

              {/* App Updates Section */}
              <section className={`${styles.section} ${isDark ? styles.dark : ''}`}>
                <UpdaterControl />
              </section>

              {/* Version Information */}
              <section className={`${styles.section} ${isDark ? styles.dark : ''}`}>
                <Versions />
              </section>
            </div>
          </ClipsProvider>
        </div>
      </div>
    </div>
  )
}

export default App
