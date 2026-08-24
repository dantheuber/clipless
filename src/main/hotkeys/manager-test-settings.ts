import { DEFAULT_HOTKEY_SETTINGS, DEFAULT_SETTINGS } from '../storage/defaults';

export const disabledSettings = () => ({
  ...DEFAULT_SETTINGS,
  hotkeys: { ...DEFAULT_HOTKEY_SETTINGS, enabled: false },
});

export const enabledSettings = (
  enabled: Partial<typeof DEFAULT_HOTKEY_SETTINGS>
): typeof DEFAULT_SETTINGS => ({
  ...DEFAULT_SETTINGS,
  hotkeys: {
    ...DEFAULT_HOTKEY_SETTINGS,
    focusWindow: { enabled: false, key: 'Ctrl+Shift+V' },
    quickClip1: { enabled: false, key: 'Ctrl+Shift+1' },
    quickClip2: { enabled: false, key: 'Ctrl+Shift+2' },
    quickClip3: { enabled: false, key: 'Ctrl+Shift+3' },
    quickClip4: { enabled: false, key: 'Ctrl+Shift+4' },
    quickClip5: { enabled: false, key: 'Ctrl+Shift+5' },
    quickLook: { enabled: false, key: 'Ctrl+Shift+T' },
    searchClips: { enabled: false, key: 'Ctrl+Shift+F' },
    ...enabled,
    enabled: true,
  },
});

export const primaryHotkeysSettings = () =>
  enabledSettings({
    focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
    quickClip1: { enabled: true, key: 'Ctrl+Shift+1' },
    quickLook: { enabled: true, key: 'Ctrl+Shift+T' },
    searchClips: { enabled: true, key: 'Ctrl+Shift+F' },
  });

export const basicHotkeySettings = () =>
  enabledSettings({
    focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
    quickClip1: { enabled: true, key: 'Ctrl+Shift+1' },
  });

export const settingsWithoutReaderHotkeys = (): typeof DEFAULT_SETTINGS => {
  const settings = enabledSettings({});
  const hotkeys = Object.fromEntries(
    Object.entries(settings.hotkeys!).filter(
      ([key]) => key !== 'quickLook' && key !== 'searchClips'
    )
  );
  return { ...settings, hotkeys } as typeof DEFAULT_SETTINGS;
};
