import classNames from 'classnames';
import { memo, useState } from 'react';
import { ClipItem, useClipsActions } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import { usePatternDetection } from '../../../hooks/usePatternDetection';
import { useContextMenu } from '../../../hooks/useContextMenu';
import styles from './Clip.module.css';
import { ClipOptions } from './ClipOptions';
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
  isCurrentCopiedClip: boolean;
  isEvenRow?: boolean;
}

export const ClipWrapper = memo(function ClipWrapper({
  clip,
  index,
  isCurrentCopiedClip,
  isEvenRow,
}: ClipProps): React.JSX.Element {
  const { copyClipToClipboard, updateClip } = useClipsActions();
  const { isLight } = useTheme();
  const { hasPatterns } = usePatternDetection(clip.content);
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRowNumberClick = async () => {
    await copyClipToClipboard(index);
  };

  const handleUpdateClip = (newContent: string) => {
    updateClip(index, { ...clip, content: newContent });
  };

  const handleEditingChange = (isEditing: boolean) => {
    setIsExpanded(isEditing);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    openContextMenu(event, index);
  };

  const renderClipContent = () => {
    switch (clip.type) {
      case 'html':
        return <HtmlClip clip={clip} />;
      case 'image':
        return <ImageClip clip={clip} />;
      case 'rtf':
        return <RtfClip clip={clip} />;
      case 'bookmark':
        return <BookmarkClip clip={clip} />;
      case 'text':
      default:
        return (
          <TextClip clip={clip} onUpdate={handleUpdateClip} onEditingChange={handleEditingChange} />
        );
    }
  };

  return (
    <div className={classNames(styles.clip, { [styles.evenRow]: isEvenRow })}>
      <div
        className={classNames(
          styles.clipRow,
          { [styles.light]: isLight },
          { [styles.expanded]: isExpanded }
        )}
        onContextMenu={handleContextMenu}
      >
        <div
          className={classNames(
            styles.rowNumber,
            { [styles.light]: isLight },
            {
              [styles.currentCopiedClip]: isCurrentCopiedClip,
            }
          )}
          onClick={handleRowNumberClick}
          title="Click to copy this clip to clipboard"
        >
          {isCurrentCopiedClip ? <FontAwesomeIcon icon="clipboard-check" /> : index + 1}
        </div>

        {/* Content area */}
        <div className={classNames(styles.contentArea, { [styles.light]: isLight })}>
          {hasPatterns && (
            <div
              className={classNames(styles.patternIndicator, { [styles.light]: isLight })}
              title="Patterns detected"
            >
              <FontAwesomeIcon icon="search" />
            </div>
          )}
          {renderClipContent()}
        </div>

        <ClipOptions index={index} hasPatterns={hasPatterns} clipContent={clip.content} />
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.targetIndex === index && (
        <ClipContextMenu
          index={index}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          hasPatterns={hasPatterns}
        />
      )}
    </div>
  );
});
