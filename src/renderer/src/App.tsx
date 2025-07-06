import { Clips } from './components/clips/Clips'
import { ClipsProvider } from './providers/clips'
import { ThemeProvider, useTheme } from './providers/theme'
import { StatusBar } from './components/StatusBar'
import classNames from 'classnames'
import styles from './App.module.css'

function AppContent(): React.JSX.Element {
  const { isLight } = useTheme();

  return (
    <div className={classNames(styles.app, { [styles.light]: isLight })}>
      {/* <UpdaterControl /> */}
      <ClipsProvider>
        <div className={styles.mainContent}>
          <Clips />
        </div>
        <StatusBar />
      </ClipsProvider>
      {/* <Versions></Versions> */}
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
