import { Clips } from './components/clips/Clips';
import { ClipsProvider } from './providers/clips';
import { ThemeProvider, useTheme } from './providers/theme';
import { LanguageDetectionProvider } from './providers/languageDetection';
import { StatusBar } from './components/StatusBar';
import { SearchBar } from './components/SearchBar';
import classNames from 'classnames';
import styles from './App.module.css';

function AppContent(): React.JSX.Element {
  const { isLight } = useTheme();

  return (
    <div className={classNames(styles.app, { [styles.light]: isLight })}>
      {/* <UpdaterControl /> */}
      <LanguageDetectionProvider>
        <ClipsProvider>
          <div className={styles.mainContent}>
            <Clips />
          </div>
          <SearchBar />
          <StatusBar />
        </ClipsProvider>
      </LanguageDetectionProvider>
      {/* <Versions></Versions> */}
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
