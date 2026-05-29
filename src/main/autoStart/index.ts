import { app } from 'electron';

export const isAutoStartSupported = (): boolean => process.platform !== 'linux';

export const applyAutoStart = (enabled: boolean): void => {
  if (!isAutoStartSupported()) {
    return;
  }

  try {
    app.setLoginItemSettings({ openAtLogin: enabled });
  } catch (error) {
    console.error('Failed to apply auto-start setting:', error);
  }
};
