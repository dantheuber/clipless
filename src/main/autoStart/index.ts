import { app } from 'electron';

const LEGACY_LOGIN_ITEM_NAME = 'com.electron'; // older builds shipped the electron-vite template AppUserModelId, so their Windows autostart registry entry lives under this name; cleared on every reconcile so a stale entry can't keep launching the app or cause a duplicate launch (current id is set in app/index.ts)

export const isAutoStartSupported = (): boolean => process.platform !== 'linux';

const canManageAutoStart = (): boolean => isAutoStartSupported() && app.isPackaged; // only packaged builds: in dev/preview process.execPath points at node_modules/electron, so a login item would register a useless boot entry and clobber the real install's

export const applyAutoStart = (enabled: boolean): boolean => {
  if (!canManageAutoStart()) {
    return true; // returns whether the OS now holds the requested state — the settings window shows "not saved, retry" when false (spec 15.5); where login items are not managed (Linux, dev builds) there is nothing to refuse, so that counts as applied
  }

  try {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: false, name: LEGACY_LOGIN_ITEM_NAME }); // clearing the legacy entry first keeps the AppUserModelId migration self-healing across upgrades
    }
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin === enabled;
  } catch (error) {
    console.error('Failed to apply auto-start setting:', error);
    return false;
  }
};

export const getAutoStartState = (): boolean | null => {
  if (!canManageAutoStart()) {
    return null; // autostart is not managed by this process (Linux, or unpackaged dev/preview) — callers fall back to the persisted setting instead of showing a misleading value
  }

  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (error) {
    console.error('Failed to read auto-start setting:', error);
    return null;
  }
};
