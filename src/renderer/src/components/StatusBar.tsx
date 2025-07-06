import React from 'react';
import { useClips } from '../providers/clips';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faClipboard, faLock } from '@fortawesome/free-solid-svg-icons';

interface StatusBarProps {
  onOpenSettings?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenSettings }) => {
  const { clips, maxClips, isClipLocked } = useClips();
  
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
    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        <span className="flex items-center space-x-1">
          <FontAwesomeIcon icon={faClipboard} className="w-4 h-4" />
          <span>
            {activeClipsCount} / {maxClips} clips
          </span>
        </span>
        
        {lockedClipsCount > 0 && (
          <span className="flex items-center space-x-1">
            <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
            <span>{lockedClipsCount} locked</span>
          </span>
        )}
      </div>

      <button
        onClick={handleOpenSettings}
        className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Open Settings"
      >
        <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
        <span>Settings</span>
      </button>
    </div>
  );
};
