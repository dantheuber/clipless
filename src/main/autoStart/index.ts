import { app } from 'electron';

/**
 * Legacy registry value name used by older builds. On Windows, Electron writes
 * the login-item entry to the `Run` registry key under the app's
 * AppUserModelId. Earlier versions shipped with the electron-vite template
 * default (`com.electron`), so their autostart entry lives under that name. We
 * remove it whenever reconciling so a stale entry can't keep launching the app
 * after autostart is turned off — and can't cause a duplicate launch while it's
 * on. The current AppUserModelId is set in app/index.ts.
 */
const LEGACY_LOGIN_ITEM_NAME = 'com.electron';

/** Auto-start via OS login items is not supported on Linux. */
export const isAutoStartSupported = (): boolean => process.platform !== 'linux';

/**
 * Only packaged builds may manage OS login items. In dev/preview,
 * `process.execPath` points at `node_modules/electron`, so writing a login item
 * would register a useless entry at boot and clobber the real install's
 * autostart entry.
 */
const canManageAutoStart = (): boolean => isAutoStartSupported() && app.isPackaged;

/**
 * Reconcile the OS login-item state with the desired setting. Clears the legacy
 * Windows entry first so the migration to the current AppUserModelId is
 * self-healing across upgrades.
 *
 * Returns whether the OS now holds the requested state. Where login items are not
 * managed (Linux, dev builds) there is nothing to refuse, so that counts as applied.
 * The settings window shows "not saved, retry" on the row when this is false (spec 15.5).
 */
export const applyAutoStart = (enabled: boolean): boolean => {
  if (!canManageAutoStart()) {
    return true;
  }

  try {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: false, name: LEGACY_LOGIN_ITEM_NAME });
    }
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin === enabled;
  } catch (error) {
    console.error('Failed to apply auto-start setting:', error);
    return false;
  }
};

/**
 * Read the actual OS login-item state. Returns `null` when autostart is not
 * managed by this process (Linux, or an unpackaged dev/preview build) so callers
 * can fall back to the persisted setting instead of showing a misleading value.
 */
export const getAutoStartState = (): boolean | null => {
  if (!canManageAutoStart()) {
    return null;
  }

  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (error) {
    console.error('Failed to read auto-start setting:', error);
    return null;
  }
};
