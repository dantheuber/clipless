import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { clipText, useClipsActions, useClipsData, useQuickLook } from '../../../providers/clips';
import { hasContent } from '../../../providers/clips/quickLook';
import { useScanIndex } from '../../../providers/scan';
import { useToast } from '../../useToast';
import { extractTemplateTokens, generateTextFromTemplate } from '../../../../../shared/templates';
import { ROW_ONE_REASON, templatePreview } from './menuText';
import { ContextMenuItem } from './ContextMenuItem';
import styles from './ClipContextMenu.module.css';

interface ClipContextMenuProps {
  index: number;
  x: number;
  y: number;
  onClose: () => void;
}

export function ClipContextMenu({ index, x, y, onClose }: ClipContextMenuProps) {
  const { isClipLocked, toggleClipLock, emptyClip, getClip, copyClipToClipboard } =
    useClipsActions();
  const { clips } = useClipsData();
  const { openQuickLook } = useQuickLook();
  const { templates } = useScanIndex();
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);

  const clip = getClip(index);
  const isFirstClip = index === 0;
  const empty = !hasContent(clip);

  const clipTemplates = useMemo(
    () => templates.filter((t) => extractTemplateTokens(t.content).named.length === 0),
    [templates]
  );
  const rowTexts = useMemo(() => clips.map((c) => clipText(c)), [clips]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [onClose]);

  useEffect(() => {
    const menu = menuRef.current!;
    const rect = menu.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewport.width) {
      adjustedX = viewport.width - rect.width - 10;
    }

    if (y + rect.height > viewport.height) {
      adjustedY = viewport.height - rect.height - 10;
    }

    menu.style.left = `${Math.max(10, adjustedX)}px`;
    menu.style.top = `${Math.max(10, adjustedY)}px`;
  }, [x, y]);

  const handleCopyClick = async () => {
    onClose();
    await copyClipToClipboard(index);
  };

  const handleQuickLook = () => {
    onClose();
    openQuickLook(clip.id, index);
  };

  const handleLockClick = () => {
    toggleClipLock(index);
    onClose();
  };

  const handleDeleteClick = () => {
    emptyClip(index);
    onClose();
  };

  const handleTemplate = async (name: string, text: string) => {
    onClose();
    try {
      await window.api.setClipboardText(text);
      toast(`Copied "${name}" to the clipboard (${text.length} chars)`, text.split('\n'));
    } catch (error) {
      console.error('Failed to copy template text:', error);
      toast(`Could not copy "${name}"`, String(error));
    }
  };

  const rowOneReason = isFirstClip ? ROW_ONE_REASON : undefined;

  return createPortal(
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
      data-testid="clip-context-menu"
    >
      <ContextMenuItem icon="copy" label="Copy" disabled={empty} onClick={handleCopyClick} />
      <ContextMenuItem icon="eye" label="Quick look" disabled={empty} onClick={handleQuickLook} />

      <div
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={submenuOpen}
        aria-disabled={clipTemplates.length === 0 ? 'true' : undefined}
        className={classNames(styles.menuItem, styles.hasSubmenu, {
          [styles.disabled]: clipTemplates.length === 0,
        })}
        onMouseEnter={() => setSubmenuOpen(true)}
        onMouseLeave={() => setSubmenuOpen(false)}
        onClick={clipTemplates.length === 0 ? undefined : () => setSubmenuOpen((open) => !open)}
        data-testid="menu-fill-clip-template"
      >
        <FontAwesomeIcon icon="file-lines" className={styles.menuIcon} />
        <span>Fill clip template</span>
        {clipTemplates.length === 0 ? (
          <span className={styles.reason}>no clip templates</span>
        ) : (
          <FontAwesomeIcon icon="chevron-right" className={styles.chevron} />
        )}
        {submenuOpen && clipTemplates.length > 0 && (
          <div className={styles.submenu} role="menu" data-testid="clip-template-submenu">
            {clipTemplates.map((template) => {
              const text = generateTextFromTemplate(template, rowTexts);
              return (
                <div
                  key={template.id}
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleTemplate(template.name, text);
                  }}
                >
                  <span>{template.name}</span>
                  <span className={styles.preview}>{templatePreview(text)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.separator} />

      <ContextMenuItem
        icon={isClipLocked(index) ? 'lock-open' : 'lock'}
        label={isClipLocked(index) ? 'Unlock' : 'Lock'}
        disabled={isFirstClip || empty}
        reason={rowOneReason}
        className={styles.warning}
        onClick={handleLockClick}
      />
      <ContextMenuItem
        icon="trash"
        label="Delete"
        disabled={isFirstClip || empty}
        reason={rowOneReason}
        className={styles.danger}
        onClick={handleDeleteClick}
      />
    </div>,
    document.body
  );
}
