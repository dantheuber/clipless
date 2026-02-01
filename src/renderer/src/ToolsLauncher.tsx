import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './providers/theme';
import { QuickClipsScanner } from './components/clips/QuickClipsScanner';

export default function ToolsLauncher(): React.JSX.Element {
  const [clipContent, setClipContent] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for initialization data from the main process
    const handleInitialize = (clipContent: string) => {
      setClipContent(clipContent);
      setIsReady(true);
    };

    // Set up the IPC listener
    window.api.onToolsLauncherInitialize(handleInitialize);

    // Signal that the window is ready
    window.api.toolsLauncherReady();

    return () => {
      // Clean up listener when component unmounts
      window.api.removeAllListeners?.('tools-launcher-initialize');
    };
  }, []);

  const handleClose = () => {
    // Close the tools launcher window
    window.api.closeToolsLauncher();
  };

  if (!isReady) {
    return (
      <ThemeProvider>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            color: 'var(--text-color)',
            backgroundColor: 'var(--background-color)',
          }}
        >
          Loading...
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        <QuickClipsScanner isOpen={true} onClose={handleClose} clipContent={clipContent} />
      </div>
    </ThemeProvider>
  );
}
