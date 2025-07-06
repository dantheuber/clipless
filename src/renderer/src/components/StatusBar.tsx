import React from 'react';
import { useClips } from '../providers/clips';
import { useTheme } from '../providers/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  onOpenSettings?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenSettings }) => {
  const { clips, maxClips, isClipLocked } = useClips();
  const { isLight } = useTheme();
  
  // Count non-empty clips
  const activeClipsCount = clips.filter(clip => clip.content.trim() !== '').length;
  
  // Count locked clips
  const lockedClipsCount = clips.filter((_, index) => isClipLocked(index)).length;

  const handleOpenSettings = async () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else if (window.api?.openSettings) {
      try {
        await window.api.openSettings();
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  return (
    <div className={classNames(styles.statusBar, { [styles.light]: isLight })}>
      <div className={styles.leftSection}>
        <span className={styles.statItem}>
          <FontAwesomeIcon icon="clipboard" className={styles.icon} />
          <span>
            {activeClipsCount} / {maxClips} clips
          </span>
        </span>
        
        {lockedClipsCount > 0 && (
          <span className={styles.statItem}>
            <FontAwesomeIcon icon="lock" className={styles.icon} />
            <span>{lockedClipsCount} locked</span>
          </span>
        )}
      </div>

      <button
        onClick={handleOpenSettings}
        className={classNames(styles.settingsButton, { [styles.light]: isLight })}
        title="Open Settings"
      >
        <FontAwesomeIcon icon="screwdriver-wrench" className={styles.icon} />
        <span>Settings</span>
      </button>
    </div>
  );
};
