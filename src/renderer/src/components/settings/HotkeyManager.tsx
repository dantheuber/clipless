import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import {
  useHotkeyManager,
  LoadingState,
  HotkeyHeader,
  GlobalToggle,
  HotkeyList,
  HotkeyInstructions,
  SavingIndicator,
} from './hotkeys';
import styles from './HotkeyManager.module.css';

interface HotkeyManagerProps {
  onClose?: () => void;
}

export const HotkeyManager: React.FC<HotkeyManagerProps> = () => {
  const { isLight } = useTheme();
  const {
    hotkeySettings,
    loading,
    saving,
    editingHotkey,
    listeningForKey,
    handleGlobalToggle,
    handleHotkeyToggle,
    startKeyCapture,
    cancelKeyCapture,
  } = useHotkeyManager();

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className={classNames(styles.container, { [styles.light]: isLight })}>
      <HotkeyHeader />

      <GlobalToggle
        hotkeySettings={hotkeySettings}
        onGlobalToggle={handleGlobalToggle}
        saving={saving}
      />

      <HotkeyList
        hotkeySettings={hotkeySettings}
        editingHotkey={editingHotkey}
        listeningForKey={listeningForKey}
        saving={saving}
        onStartKeyCapture={startKeyCapture}
        onCancelKeyCapture={cancelKeyCapture}
        onHotkeyToggle={handleHotkeyToggle}
      />

      <HotkeyInstructions hotkeySettings={hotkeySettings} />

      <SavingIndicator saving={saving} />
    </div>
  );
};

export default HotkeyManager;
