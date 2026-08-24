import { Clips } from './components/clips/Clips';
import { ClipsProvider } from './providers/clips';
import { ScanIndexProvider } from './providers/scan';
import { ThemeProvider } from './providers/theme';
import { LanguageDetectionProvider } from './providers/languageDetection';
import { ToastProvider } from './components/Toast';
import { StatusBar } from './components/StatusBar';
import { SearchBar } from './components/SearchBar';
import { Tray } from './components/tray/Tray';
import { QuickLook } from './components/quick-look/QuickLook';
import styles from './App.module.css';

function AppContent(): React.JSX.Element {
  return (
    <div className={styles.app}>
      <LanguageDetectionProvider>
        <ScanIndexProvider>
          <ClipsProvider>
            <div className={styles.mainContent}>
              <Clips />
              <QuickLook />
            </div>
            <Tray />
            <SearchBar />
            <StatusBar />
          </ClipsProvider>
        </ScanIndexProvider>
      </LanguageDetectionProvider>
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
