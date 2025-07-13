import classNames from 'classnames';
import { useState } from 'react';
import { ClipItem, useClips } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import { usePatternDetection } from '../../../hooks/usePatternDetection';
import styles from './Clip.module.css';
import { ClipOptions } from './ClipOptions';
import { TextClip } from './TextClip';
import { HtmlClip } from './HtmlClip';
import { ImageClip } from './ImageClip';
import { RtfClip } from './RtfClip';
import { BookmarkClip } from './BookmarkClip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ClipProps {
  clip: ClipItem;
  index: number;
}

export function ClipWrapper({ clip, index }: ClipProps): React.JSX.Element {
  const { copyClipToClipboard, clipCopyIndex, updateClip } = useClips();
  const { isLight } = useTheme();
  const { hasPatterns } = usePatternDetection(clip.content);
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

  const isCurrentCopiedClip = clipCopyIndex === index;

  return (
    <li className={styles.clip}>
      <div
        className={classNames(
          styles.clipRow,
          { [styles.light]: isLight },
          { [styles.expanded]: isExpanded }
        )}
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
              title="Quick Clips patterns detected"
            >
              <FontAwesomeIcon icon="search" />
            </div>
          )}
          {renderClipContent()}
        </div>

        <ClipOptions index={index} />
      </div>
    </li>
  );
}
