import type { HotkeySettings } from '../../../../../shared/types';

export const hotkeySettings = (enabled: boolean): HotkeySettings => ({
  enabled,
  focusWindow: { enabled: true, key: 'CommandOrControl+Shift+V' },
  quickClip1: { enabled: true, key: 'CommandOrControl+Shift+1' },
  quickClip2: { enabled: true, key: 'CommandOrControl+Shift+2' },
  quickClip3: { enabled: true, key: 'CommandOrControl+Shift+3' },
  quickClip4: { enabled: true, key: 'CommandOrControl+Shift+4' },
  quickClip5: { enabled: true, key: 'CommandOrControl+Shift+5' },
  quickLook: { enabled: true, key: 'CommandOrControl+Shift+T' },
  searchClips: { enabled: true, key: 'CommandOrControl+Shift+F' },
});
