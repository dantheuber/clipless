import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import type { HotkeySettings } from '../../../../../shared/types';
import styles from '../HotkeyManager.module.css';

interface HotkeyInstructionsProps {
  hotkeySettings: HotkeySettings;
}

export const HotkeyInstructions: React.FC<HotkeyInstructionsProps> = ({ hotkeySettings }) => {
  const { isLight } = useTheme();

  if (!hotkeySettings.enabled) {
    return null;
  }

  return (
    <div className={classNames(styles.instructions, { [styles.light]: isLight })}>
      <h3>Instructions:</h3>
      <ul>
        <li>Click "Edit" next to any hotkey to change it</li>
        <li>Press the desired key combination (must include Ctrl/Cmd, Shift, or Alt)</li>
        <li>Press Escape to cancel editing</li>
        <li>Use the toggle switches to enable/disable individual hotkeys</li>
      </ul>
      <p className={styles.note}>
        <strong>Quick Clip Behavior:</strong> Quick Clip hotkeys copy clips by their display number
        (1-5), so hotkey 1 copies the first clip, hotkey 2 copies the second clip, and so on.
      </p>
      <p className={styles.note}>
        <strong>Note:</strong> Hotkeys may conflict with other applications. Choose combinations
        that aren't commonly used by your system or other software.
      </p>
    </div>
  );
};
