import classNames from 'classnames'
import UpdaterControl from './components/settings/UpdaterControl'
import Versions from './components/settings/Versions'
import { ClipsProvider } from './providers/clips'
import { StorageSettings } from './components/settings/StorageSettings'
import styles from './Settings.module.css'

function App(): React.JSX.Element {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <div className={classNames(styles.container, { [styles.dark]: isDark })}>
      <div className={styles.scrollContainer}>
        <div className={styles.content}>
          <ClipsProvider>
            <div className={styles.grid}>
              {/* Storage Settings Section */}
              <section className={classNames(styles.section, { [styles.dark]: isDark })}>
                <StorageSettings />
              </section>

              {/* App Updates Section */}
              <section className={classNames(styles.section, { [styles.dark]: isDark })}>
                <UpdaterControl />
              </section>

              {/* Version Information */}
              <section className={classNames(styles.section, { [styles.dark]: isDark })}>
                <Versions />
              </section>
            </div>
          </ClipsProvider>
        </div>
      </div>
    </div>
  );
}

export default App
