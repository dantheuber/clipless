import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { detectLanguage, isCode, mapToSyntaxHighlighterLanguage } from '../utils/languageDetection';

/**
 * Language detection context for managing code detection and syntax highlighting settings
 */

export interface LanguageDetectionSettings {
  codeDetectionEnabled: boolean;
}

export interface DetectedLanguageInfo {
  language: string | null;
  isCode: boolean;
  syntaxHighlighterLanguage: string;
}

export interface LanguageDetectionContextType {
  // Settings
  settings: LanguageDetectionSettings;
  updateSettings: (newSettings: Partial<LanguageDetectionSettings>) => void;
  
  // Language detection functions
  detectTextLanguage: (text: string) => DetectedLanguageInfo;
  isCodeDetectionEnabled: boolean;
}

const defaultSettings: LanguageDetectionSettings = {
  codeDetectionEnabled: true,
};

export const LanguageDetectionContext = createContext<LanguageDetectionContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  detectTextLanguage: () => ({ language: null, isCode: false, syntaxHighlighterLanguage: 'text' }),
  isCodeDetectionEnabled: true,
});

export const useLanguageDetection = (): LanguageDetectionContextType => 
  useContext(LanguageDetectionContext);

export const LanguageDetectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<LanguageDetectionSettings>(defaultSettings);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api) {
        setIsInitiallyLoading(false);
        return;
      }

      try {
        const storedSettings = await window.api.storageGetSettings();
        if (storedSettings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            codeDetectionEnabled: storedSettings.codeDetectionEnabled ?? defaultSettings.codeDetectionEnabled,
          }));
        }
      } catch (error) {
        console.error('Failed to load language detection settings:', error);
      } finally {
        setIsInitiallyLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage whenever they change
  useEffect(() => {
    if (isInitiallyLoading) return;

    const saveSettings = async () => {
      if (!window.api) return;

      try {
        // Get current settings and merge with language detection settings
        const currentSettings = await window.api.storageGetSettings() || {};
        const updatedSettings = {
          ...currentSettings,
          codeDetectionEnabled: settings.codeDetectionEnabled,
        };
        await window.api.storageSaveSettings(updatedSettings);
      } catch (error) {
        console.error('Failed to save language detection settings:', error);
      }
    };

    // Debounce saves
    const timeoutId = setTimeout(saveSettings, 500);
    return () => clearTimeout(timeoutId);
  }, [settings, isInitiallyLoading]);

  // Listen for settings updates from other windows
  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: any) => {
      if (updatedSettings && typeof updatedSettings.codeDetectionEnabled === 'boolean') {
        setSettings(prevSettings => ({
          ...prevSettings,
          codeDetectionEnabled: updatedSettings.codeDetectionEnabled,
        }));
      }
    };

    window.api.onSettingsUpdated(handleSettingsUpdate);

    return () => {
      if (window.api?.removeSettingsListeners) {
        window.api.removeSettingsListeners();
      }
    };
  }, []);

  /**
   * Update language detection settings
   */
  const updateSettings = useCallback((newSettings: Partial<LanguageDetectionSettings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings,
    }));
  }, []);

  /**
   * Detect the language of a text snippet
   */
  const detectTextLanguage = useCallback((text: string): DetectedLanguageInfo => {
    if (!settings.codeDetectionEnabled) {
      return {
        language: null,
        isCode: false,
        syntaxHighlighterLanguage: 'text',
      };
    }

    const detectedLanguage = detectLanguage(text);
    const appearsToBeCode = isCode(text);
    const syntaxHighlighterLanguage = detectedLanguage 
      ? mapToSyntaxHighlighterLanguage(detectedLanguage)
      : (appearsToBeCode ? 'text' : 'text');

    return {
      language: detectedLanguage,
      isCode: appearsToBeCode,
      syntaxHighlighterLanguage,
    };
  }, [settings.codeDetectionEnabled]);

  const providerValue = useMemo(() => ({
    settings,
    updateSettings,
    detectTextLanguage,
    isCodeDetectionEnabled: settings.codeDetectionEnabled,
  }), [settings, updateSettings, detectTextLanguage]);

  return (
    <LanguageDetectionContext.Provider value={providerValue}>
      {children}
    </LanguageDetectionContext.Provider>
  );
};
