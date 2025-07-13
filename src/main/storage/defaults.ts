import type { UserSettings, AppData, HotkeySettings } from '../../shared/types';
import { DEFAULT_MAX_CLIPS } from '../../shared/constants';

export const DEFAULT_HOTKEY_SETTINGS: HotkeySettings = {
  enabled: false,
  focusWindow: {
    enabled: true,
    key: 'CommandOrControl+Shift+V',
  },
  quickClip1: {
    enabled: true,
    key: 'CommandOrControl+Shift+1',
  },
  quickClip2: {
    enabled: true,
    key: 'CommandOrControl+Shift+2',
  },
  quickClip3: {
    enabled: true,
    key: 'CommandOrControl+Shift+3',
  },
  quickClip4: {
    enabled: true,
    key: 'CommandOrControl+Shift+4',
  },
  quickClip5: {
    enabled: true,
    key: 'CommandOrControl+Shift+5',
  },
};

export const DEFAULT_SETTINGS: UserSettings = {
  maxClips: DEFAULT_MAX_CLIPS,
  startMinimized: false,
  autoStart: false,
  theme: 'system',
  windowTransparency: 0,
  transparencyEnabled: false,
  opaqueWhenFocused: true,
  alwaysOnTop: false,
  rememberWindowPosition: true,
  hotkeys: DEFAULT_HOTKEY_SETTINGS,
};

export const DEFAULT_DATA: AppData = {
  clips: [],
  settings: DEFAULT_SETTINGS,
  templates: [],
  searchTerms: [],
  quickTools: [],
  version: __APP_VERSION__,
};
