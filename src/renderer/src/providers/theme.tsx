import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UserSettings } from '../../../shared/types';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isLight: boolean;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  // Update effective theme based on user preference and system preference
  const updateEffectiveTheme = useCallback((themePreference: Theme) => {
    let resolvedTheme: 'light' | 'dark';

    if (themePreference === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = themePreference;
    }

    setEffectiveTheme(resolvedTheme);

    // Apply theme to document body for global CSS
    if (resolvedTheme === 'light') {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, []);

  // Load theme from settings
  useEffect(() => {
    const loadTheme = async () => {
      if (!window.api) return;

      try {
        const settings: UserSettings = await window.api.storageGetSettings();
        const userTheme = settings?.theme || 'system';
        setThemeState(userTheme);
        updateEffectiveTheme(userTheme);
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        // Default to system theme
        updateEffectiveTheme('system');
      }
    };

    loadTheme();
  }, []);

  // Listen for settings changes from other windows
  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: UserSettings) => {
      if (updatedSettings.theme) {
        setThemeState(updatedSettings.theme);
        updateEffectiveTheme(updatedSettings.theme);
      }
    };

    // onSettingsUpdated now returns a cleanup function
    const cleanup = window.api.onSettingsUpdated(handleSettingsUpdate);

    // Return the cleanup function to remove only this specific listener
    return cleanup;
  }, []); // Empty dependency array since we want this to run only once

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => updateEffectiveTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    updateEffectiveTheme(newTheme);

    // Save theme to settings
    if (window.api) {
      try {
        const currentSettings: UserSettings = await window.api.storageGetSettings();
        await window.api.storageSaveSettings({
          ...currentSettings,
          theme: newTheme,
        });
      } catch (error) {
        console.error('Failed to save theme settings:', error);
      }
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme,
    isLight: effectiveTheme === 'light',
    isDark: effectiveTheme === 'dark',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
