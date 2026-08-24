import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { UserSettings } from '../../../shared/types';
import { GROUP_COLOUR_SLOTS } from '../../../shared/groupColours';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isLight: boolean;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function applySlotVariables(theme: 'light' | 'dark'): void {
  const root = document.documentElement.style;
  GROUP_COLOUR_SLOTS.forEach((slot, index) => {
    root.setProperty(`--slot-${index}`, theme === 'light' ? slot.light : slot.dark);
  });
}

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  const updateEffectiveTheme = useCallback((themePreference: Theme) => {
    let resolvedTheme: 'light' | 'dark';

    if (themePreference === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = themePreference;
    }

    setEffectiveTheme(resolvedTheme);
    applySlotVariables(resolvedTheme);

    if (resolvedTheme === 'light') {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, []);

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
        updateEffectiveTheme('system');
      }
    };

    loadTheme();
  }, [updateEffectiveTheme]);

  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: UserSettings) => {
      if (updatedSettings.theme) {
        setThemeState(updatedSettings.theme);
        updateEffectiveTheme(updatedSettings.theme);
      }
    };

    const cleanup = window.api.onSettingsUpdated(handleSettingsUpdate);
    return cleanup;
  }, [updateEffectiveTheme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => updateEffectiveTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateEffectiveTheme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    updateEffectiveTheme(newTheme);

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

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
