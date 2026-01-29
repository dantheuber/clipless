import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClips } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import classNames from 'classnames';
import styles from './ClipContextMenu.module.css';

interface ClipContextMenuProps {
  index: number;
  x: number;
  y: number;
  onClose: () => void;
}

export function ClipContextMenu({ index, x, y, onClose }: ClipContextMenuProps) {
  const { isLight } = useTheme();
  const { isClipLocked, toggleClipLock, emptyClip, getClip, copyClipToClipboard } = useClips();
  const menuRef = useRef<HTMLDivElement>(null);

  const clip = getClip(index);
  const isFirstClip = index === 0;

  // Check for patterns
  const [hasPatterns, setHasPatterns] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const checkPatterns = async () => {
      if (!clip.content || clip.content.trim().length === 0) {
        setHasPatterns(false);
        return;
      }

      try {
        const matches = await window.api.quickClipsScanText(clip.content);
        if (!isCancelled) {
          setHasPatterns(matches.length > 0);
        }
      } catch {
        if (!isCancelled) {
          setHasPatterns(false);
        }
      }
    };

    checkPatterns();

    return () => {
      isCancelled = true;
    };
  }, [clip.content]);

  // Handle clicks outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position the menu to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let adjustedX = x;
      let adjustedY = y;

      // Adjust X position if menu would go off-screen
      if (x + rect.width > viewport.width) {
        adjustedX = viewport.width - rect.width - 10;
      }

      // Adjust Y position if menu would go off-screen
      if (y + rect.height > viewport.height) {
        adjustedY = viewport.height - rect.height - 10;
      }

      menu.style.left = `${Math.max(10, adjustedX)}px`;
      menu.style.top = `${Math.max(10, adjustedY)}px`;
    }
  }, [x, y]);

  const handleCopyClick = async () => {
    await copyClipToClipboard(index);
    onClose();
  };

  const handleLockClick = () => {
    if (!isFirstClip) {
      toggleClipLock(index);
    }
    onClose();
  };

  const handleDeleteClick = () => {
    if (!isFirstClip) {
      emptyClip(index);
    }
    onClose();
  };

  const handleScanClick = async () => {
    if (isFirstClip) {
      onClose();
      return;
    }

    try {
      await window.api.openToolsLauncher(clip.content);
      onClose();
    } catch (error) {
      console.error('Failed to open tools launcher:', error);
    }
  };

  return (
    <div
      ref={menuRef}
      className={classNames(styles.contextMenu, { [styles.light]: isLight })}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.menuItem} onClick={handleCopyClick}>
        <FontAwesomeIcon icon="copy" className={styles.menuIcon} />
        <span>Copy to Clipboard</span>
      </div>

      <div className={styles.separator} />

      <div
        className={classNames(styles.menuItem, {
          [styles.disabled]: isFirstClip,
          [styles.highlighted]: hasPatterns,
        })}
        onClick={handleScanClick}
      >
        <FontAwesomeIcon icon="search" className={styles.menuIcon} />
        <span>{hasPatterns ? 'Open Tools Launcher ⚡' : 'Open Tools Launcher'}</span>
      </div>

      <div className={styles.separator} />

      <div
        className={classNames(styles.menuItem, styles.warning, { [styles.disabled]: isFirstClip })}
        onClick={handleLockClick}
      >
        <FontAwesomeIcon
          icon={isClipLocked(index) ? 'lock-open' : 'lock'}
          className={styles.menuIcon}
        />
        <span>{isClipLocked(index) ? 'Unlock Clip' : 'Lock Clip'}</span>
      </div>

      <div
        className={classNames(styles.menuItem, styles.danger, { [styles.disabled]: isFirstClip })}
        onClick={handleDeleteClick}
      >
        <FontAwesomeIcon icon="trash" className={styles.menuIcon} />
        <span>Delete Clip</span>
      </div>
    </div>
  );
}
