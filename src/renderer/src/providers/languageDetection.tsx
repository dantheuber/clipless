import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { detectLanguage, isCode, mapToSyntaxHighlighterLanguage } from '../utils/languageDetection';

export interface LanguageDetectionSettings {
  codeDetectionEnabled: boolean;
  showLanguageLabel: boolean;
}

export interface DetectedLanguageInfo {
  language: string | null;
  isCode: boolean;
  syntaxHighlighterLanguage: string;
}

export interface LanguageDetectionContextType {
  settings: LanguageDetectionSettings;
  updateSettings: (newSettings: Partial<LanguageDetectionSettings>) => void;

  detectTextLanguage: (text: string) => DetectedLanguageInfo;
  isCodeDetectionEnabled: boolean;
  isLanguageLabelEnabled: boolean;
}

const defaultSettings: LanguageDetectionSettings = {
  codeDetectionEnabled: true,
  showLanguageLabel: true,
};

const LanguageDetectionContext = createContext<LanguageDetectionContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  detectTextLanguage: () => ({ language: null, isCode: false, syntaxHighlighterLanguage: 'text' }),
  isCodeDetectionEnabled: true,
  isLanguageLabelEnabled: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguageDetection = (): LanguageDetectionContextType =>
  useContext(LanguageDetectionContext);

export function LanguageDetectionProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<LanguageDetectionSettings>(defaultSettings);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api) {
        setIsInitiallyLoading(false);
        return;
      }

      try {
        const storedSettings = await window.api.storageGetSettings();
        if (storedSettings) {
          setSettings((prevSettings) => ({
            ...prevSettings,
            codeDetectionEnabled:
              storedSettings.codeDetectionEnabled ?? defaultSettings.codeDetectionEnabled,
            showLanguageLabel:
              storedSettings.showLanguageLabel ?? defaultSettings.showLanguageLabel,
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

  useEffect(() => {
    if (isInitiallyLoading) return;

    const saveSettings = async () => {
      if (!window.api) return;

      try {
        const currentSettings = (await window.api.storageGetSettings()) || {};
        const updatedSettings = {
          ...currentSettings,
          codeDetectionEnabled: settings.codeDetectionEnabled,
          showLanguageLabel: settings.showLanguageLabel,
        };
        await window.api.storageSaveSettings(updatedSettings);
      } catch (error) {
        console.error('Failed to save language detection settings:', error);
      }
    };

    const timeoutId = setTimeout(saveSettings, 500);
    return () => clearTimeout(timeoutId);
  }, [settings, isInitiallyLoading]);

  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: Partial<LanguageDetectionSettings>) => {
      if (!updatedSettings) return;
      setSettings((prevSettings) => {
        const next = { ...prevSettings };
        if (typeof updatedSettings.codeDetectionEnabled === 'boolean') {
          next.codeDetectionEnabled = updatedSettings.codeDetectionEnabled;
        }
        if (typeof updatedSettings.showLanguageLabel === 'boolean') {
          next.showLanguageLabel = updatedSettings.showLanguageLabel;
        }
        return next;
      });
    };

    return window.api.onSettingsUpdated(handleSettingsUpdate);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<LanguageDetectionSettings>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...newSettings,
    }));
  }, []);

  const detectTextLanguage = useCallback(
    (text: string): DetectedLanguageInfo => {
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
        : appearsToBeCode
          ? 'text'
          : 'text';

      return {
        language: detectedLanguage,
        isCode: appearsToBeCode,
        syntaxHighlighterLanguage,
      };
    },
    [settings.codeDetectionEnabled]
  );

  const providerValue = useMemo(
    () => ({
      settings,
      updateSettings,
      detectTextLanguage,
      isCodeDetectionEnabled: settings.codeDetectionEnabled,
      isLanguageLabelEnabled: settings.codeDetectionEnabled && settings.showLanguageLabel,
    }),
    [settings, updateSettings, detectTextLanguage]
  );

  return (
    <LanguageDetectionContext.Provider value={providerValue}>
      {children}
    </LanguageDetectionContext.Provider>
  );
}
