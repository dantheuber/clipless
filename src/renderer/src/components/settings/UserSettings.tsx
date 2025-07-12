import React from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingState } from './usersettings/LoadingState';
import { ErrorState } from './usersettings/ErrorState';
import { ApplicationSettings } from './usersettings/ApplicationSettings';
import { WindowSettings } from './usersettings/WindowSettings';
import { SavingIndicator } from './usersettings/SavingIndicator';
import { CloseButton } from './usersettings/CloseButton';
import { useUserSettings } from './usersettings/useUserSettings';
import styles from './StorageSettings.module.css';

interface UserSettingsProps {
  onClose?: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const {
    settings,
    loading,
    saving,
    pendingMaxClips,
    showConfirmDialog,
    tempMaxClips,
    debounceTimeout,
    clips,
    handleSettingChange,
    handleMaxClipsChange,
    confirmMaxClipsChange,
    cancelMaxClipsChange,
  } = useUserSettings();

  if (loading) {
    return <LoadingState />;
  }

  if (!settings) {
    return <ErrorState />;
  }

  return (
    <div className={styles.container}>
      <ApplicationSettings
        settings={settings}
        onSettingChange={handleSettingChange}
        onMaxClipsChange={handleMaxClipsChange}
        saving={saving}
        tempMaxClips={tempMaxClips}
        debounceTimeout={debounceTimeout}
      />

      <WindowSettings
        settings={settings}
        onSettingChange={handleSettingChange}
        saving={saving}
      />

      {/* Saving Indicator */}
      {saving && <SavingIndicator />}

      {/* Close Button */}
      {onClose && <CloseButton onClose={onClose} />}

      {/* Confirm Dialog for Max Clips Change */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirm Max Clips Change"
        message={`Changing the maximum clips from ${settings?.maxClips || 100} to ${pendingMaxClips} will result in the loss of ${Math.max(0, clips.filter(clip => clip.content && clip.content.trim() !== '').length - (pendingMaxClips || 0))} clips that cannot be recovered. The oldest clips will be removed. Are you sure you want to proceed?`}
        onConfirm={confirmMaxClipsChange}
        onCancel={cancelMaxClipsChange}
        confirmText="Yes, change"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};
