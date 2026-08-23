import React, { useEffect, useState } from 'react';
import { useClipsData, useClipsActions, useClipsMeta, useQuickLook } from '../providers/clips';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import type { HotkeySettings, UpdateState, UserSettings } from '../../../shared/types';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  onOpenSettings?: () => void;
}

/** The hotkey a button's tooltip names, when the hotkeys are on */
function hotkeyHint(
  hotkeys: HotkeySettings | undefined,
  action: 'quickLook' | 'searchClips'
): string {
  const config = hotkeys?.[action];
  return hotkeys?.enabled && config?.enabled && config.key ? ` (${config.key})` : '';
}

/**
 * The bottom strip (spec 16 rules 1 and 5): counts on the left (words drop under 480px),
 * then search with an on-state, quick look on the newest clip, settings. A downloaded
 * update is a pill here, never a strip.
 */
export const StatusBar: React.FC<StatusBarProps> = ({ onOpenSettings }) => {
  const { clips } = useClipsData();
  const { isClipLocked } = useClipsActions();
  const { maxClips, isSearchVisible, setIsSearchVisible, hideSearch } = useClipsMeta();
  const { openNewest } = useQuickLook();
  const [hotkeys, setHotkeys] = useState<HotkeySettings | undefined>();
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    window.api
      .storageGetSettings()
      .then((settings: UserSettings) => setHotkeys(settings?.hotkeys))
      .catch((error) => console.error('Failed to read hotkeys for the status bar:', error));
    return window.api.onSettingsUpdated((settings: UserSettings) => setHotkeys(settings?.hotkeys));
  }, []);

  useEffect(() => {
    window.api
      .getUpdateState()
      .then(setUpdate)
      .catch((error) => console.error('Failed to read update state:', error));
    return window.api.onUpdateState(setUpdate);
  }, []);

  // Count non-empty clips
  const activeClipsCount = clips.filter((clip) => clip.content.trim() !== '').length;

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

  const handleRestart = async (): Promise<void> => {
    try {
      await window.api.quitAndInstall();
    } catch (error) {
      console.error('Failed to restart for update:', error);
    }
  };

  const toggleSearch = () => {
    if (isSearchVisible) hideSearch();
    else setIsSearchVisible(true);
  };

  return (
    <div className={styles.statusBar} data-testid="status-bar">
      <div className={styles.leftSection}>
        <span className={styles.statItem} title={`${activeClipsCount} of ${maxClips} clips`}>
          <FontAwesomeIcon icon="clipboard" className={styles.icon} />
          <span>
            {activeClipsCount} / {maxClips}
            <span className={styles.word}> clips</span>
          </span>
        </span>

        {lockedClipsCount > 0 && (
          <span className={styles.statItem} title={`${lockedClipsCount} locked`}>
            <FontAwesomeIcon icon="lock" className={styles.icon} />
            <span>
              {lockedClipsCount}
              <span className={styles.word}> locked</span>
            </span>
          </span>
        )}
      </div>

      <div className={styles.rightSection}>
        {update.status === 'downloaded' && (
          <button
            type="button"
            className={styles.updatePill}
            onClick={handleRestart}
            title="Restart to install the update"
            data-testid="update-pill"
          >
            <FontAwesomeIcon icon="circle-arrow-up" className={styles.icon} />
            <span>{update.version ?? 'Update'} ready</span>
            <b>Restart</b>
          </button>
        )}

        <button
          type="button"
          onClick={toggleSearch}
          className={classNames(styles.iconButton, { [styles.active]: isSearchVisible })}
          title={`Filter clips${hotkeyHint(hotkeys, 'searchClips')}`}
          aria-pressed={isSearchVisible}
          data-testid="search-button"
        >
          <FontAwesomeIcon icon="search" className={styles.icon} />
        </button>

        <button
          type="button"
          onClick={openNewest}
          className={styles.iconButton}
          title={`Quick look on the newest clip${hotkeyHint(hotkeys, 'quickLook')}`}
          data-testid="quick-look-button"
        >
          <FontAwesomeIcon icon="eye" className={styles.icon} />
        </button>

        <button
          type="button"
          onClick={handleOpenSettings}
          className={styles.iconButton}
          title="Open settings"
        >
          <FontAwesomeIcon icon="screwdriver-wrench" className={styles.icon} />
        </button>
      </div>
    </div>
  );
};
