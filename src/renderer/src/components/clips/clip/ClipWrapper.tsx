import classNames from 'classnames';
import { memo, useState, type CSSProperties } from 'react';
import { ClipItem, useClipsActions, useClipsPins, useQuickLook } from '../../../providers/clips';
import { hasContent } from '../../../providers/clips/quickLook';
import { scanKeys } from '../../../providers/clips/pins';
import { useScanIndex, EMPTY_SCAN } from '../../../providers/scan';
import { useContextMenu } from '../../../hooks/useContextMenu';
import styles from './Clip.module.css';
import { ClipContextMenu } from './ClipContextMenu';
import { TextClip } from './TextClip';
import { HtmlClip } from './HtmlClip';
import { ImageClip } from './ImageClip';
import { RtfClip } from './RtfClip';
import { BookmarkClip } from './BookmarkClip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ClipProps {
  clip: ClipItem;
  index: number;

  visibleIndex: number;
  isCurrentCopiedClip: boolean;
  isEvenRow?: boolean;
  searchTerm?: string;
}

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;

export const ClipWrapper = memo(function ClipWrapper({
  clip,
  index,
  visibleIndex,
  isCurrentCopiedClip,
  isEvenRow,
  searchTerm,
}: ClipProps): React.JSX.Element {
  const { copyClipToClipboard, updateClip, isClipLocked } = useClipsActions();
  const { togglePins } = useClipsPins();
  const { quickLook, openQuickLook } = useQuickLook();
  const { getScan, slotFor } = useScanIndex();
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editSeq, setEditSeq] = useState(0);

  const scan = clip.type === 'image' ? EMPTY_SCAN : getScan(clip);
  const keys = scanKeys(scan);
  const content = hasContent(clip);
  const isOpen = quickLook.openClipId === clip.id;
  const locked = isClipLocked(index);

  const handleRowNumberClick = async () => {
    await copyClipToClipboard(index);
  };

  const handleUpdateClip = (newContent: string) => {
    updateClip(index, { ...clip, content: newContent });
  };

  const handleEditingChange = (isEditing: boolean) => {
    setIsExpanded(isEditing && clip.content.includes('\n'));
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    openContextMenu(event, index);
  };

  const open = () => {
    if (content) openQuickLook(clip.id, index);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(event.target)) return;
    if (event.key === ' ') {
      event.preventDefault();
      open();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (clip.type === 'text') {
        if (content) setEditSeq((s) => s + 1);
      } else {
        open();
      }
    } else if (event.key === 'p' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (keys.length > 0) {
        event.preventDefault();
        togglePins(keys);
      }
    }
  };

  const renderClipContent = () => {
    switch (clip.type) {
      case 'html':
        return <HtmlClip clip={clip} scan={scan} searchTerm={searchTerm} />;
      case 'image':
        return <ImageClip clip={clip} />;
      case 'rtf':
        return <RtfClip clip={clip} scan={scan} searchTerm={searchTerm} />;
      case 'bookmark':
        return <BookmarkClip clip={clip} scan={scan} searchTerm={searchTerm} />;
      case 'text':
      default:
        return (
          <TextClip
            clip={clip}
            scan={scan}
            searchTerm={searchTerm}
            onUpdate={handleUpdateClip}
            onEditingChange={handleEditingChange}
            editSeq={editSeq}
          />
        );
    }
  };

  return (
    <div className={classNames(styles.clip, { [styles.evenRow]: isEvenRow })}>
      <div
        className={classNames(styles.clipRow, {
          [styles.expanded]: isExpanded,
          [styles.selected]: isOpen,
        })}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-label={`Clip ${index + 1}`}
        data-row-index={visibleIndex}
        data-clip-index={index}
        data-testid="clip-row"
      >
        <div
          className={classNames(styles.rowNumber, {
            [styles.currentCopiedClip]: isCurrentCopiedClip,
          })}
          onClick={handleRowNumberClick}
          title="Click to copy this clip to clipboard"
          data-testid="row-number"
        >
          {isCurrentCopiedClip ? <FontAwesomeIcon icon="clipboard-check" /> : index + 1}
        </div>

        <div className={styles.contentArea}>{renderClipContent()}</div>

        <div className={styles.rightEdge}>
          {scan && scan.groups.length > 0 && (
            <span className={styles.dots} data-testid="group-dots">
              {scan.groups.map((group) => (
                <i
                  key={group}
                  className={styles.dot}
                  style={{ '--gc': `var(--slot-${slotFor(group)})` } as CSSProperties}
                  title={group}
                  data-group={group}
                />
              ))}
            </span>
          )}
          {content && (
            <button
              type="button"
              className={classNames(styles.eye, { [styles.eyeOn]: isOpen })}
              onClick={(event) => {
                event.stopPropagation();
                open();
              }}
              title="Quick look (Space)"
              aria-label="Quick look"
              tabIndex={-1}
              data-testid="eye"
            >
              <FontAwesomeIcon icon="eye" />
            </button>
          )}
          {locked && (
            <span className={styles.lock} title="Locked" data-testid="lock-glyph">
              <FontAwesomeIcon icon="lock" />
            </span>
          )}
        </div>
      </div>

      {contextMenu.isOpen && contextMenu.targetIndex === index && (
        <ClipContextMenu
          index={index}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
});
