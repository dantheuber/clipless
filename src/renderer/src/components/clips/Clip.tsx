import { useRef } from 'react';
import classNames from 'classnames';
import { ClipItem, useClips } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import styles from './Clip.module.css';
import { ClipOptions } from './ClipOptions';

interface ClipProps {
  clip: ClipItem;
  index: number;
}

export const Clip = ({ clip, index }: ClipProps): React.JSX.Element => {
  const { copyClipToClipboard, clipCopyIndex } = useClips();
  const { isLight } = useTheme();
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleRowNumberClick = async () => {
    await copyClipToClipboard(index);
  };

  const handleImageMouseEnter = (e: React.MouseEvent<HTMLImageElement>) => {
    const popover = popoverRef.current;
    if (popover) {
      const rect = e.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popoverHeight = 320; // 20rem max-height
      const popoverWidth = 320; // 20rem max-width
      
      // Calculate preferred position (to the right of the image)
      let left = rect.right + 16;
      let top = rect.top + rect.height / 2 - popoverHeight / 2; // Center the popover vertically on the image
      
      // Check if popover would extend beyond right edge of viewport
      if (left + popoverWidth > viewportWidth) {
        // Position to the left of the image instead
        left = rect.left - popoverWidth - 16;
      }
      
      // Ensure popover doesn't go beyond left edge
      if (left < 16) {
        left = 16;
      }
      
      // Check if popover would extend beyond bottom of viewport
      if (top + popoverHeight > viewportHeight) {
        // Position at bottom edge of viewport with padding
        top = viewportHeight - popoverHeight - 16;
      }
      
      // Check if popover would extend beyond top of viewport
      if (top < 16) {
        top = 16;
      }
      
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      popover.style.transform = 'none'; // Always use none since we calculate exact position
    }
  };

  const renderClipContent = () => {
    switch (clip.type) {
      case 'text':
        return <span>{clip.content}</span>;
      case 'html':
        return (
          <div>
            <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>HTML:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'image':
        return (
          <div className={styles.imagePreviewContainer}>
            <img 
              src={clip.content}
              alt="Clipboard image preview"
              className={classNames(styles.imagePreview, { [styles.light]: isLight })}
              onMouseEnter={handleImageMouseEnter}
              onError={(e) => {
                // Fallback to text if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('span');
                fallback.textContent = 'Invalid image data';
                fallback.style.color = isLight ? '#666666' : 'rgb(156 163 175)';
                fallback.style.fontSize = '0.75rem';
                target.parentNode?.appendChild(fallback);
              }}
            />
            <div ref={popoverRef} className={classNames(styles.imagePopover, { [styles.light]: isLight })}>
              <img 
                src={clip.content} 
                alt="Large image preview"
                className={classNames(styles.popoverImage, { [styles.light]: isLight })}
              />
              {/* <div className={classNames(styles.popoverInfo, { [styles.light]: isLight })}>
                <div className={classNames(styles.popoverFilename, { [styles.light]: isLight })}>
                  {clip.content.startsWith('data:image/') ? 
                    clip.content.split(';')[0].split('/')[1].toUpperCase() + ' Image' : 
                    'Image'}
                </div>
                <div className={classNames(styles.popoverSize, { [styles.light]: isLight })}>
                  {Math.round(clip.content.length * 0.75 / 1024)} KB
                </div>
              </div> */}
            </div>
            <div className={styles.imageInfo}>
              <span className={classNames(styles.imageFilename, { [styles.light]: isLight })}>
                Image ({clip.content.startsWith('data:image/') ? 
                  clip.content.split(';')[0].split('/')[1].toUpperCase() : 
                  'Unknown format'})
              </span>
              <span className={classNames(styles.imageSize, { [styles.light]: isLight })}>
                {Math.round(clip.content.length * 0.75 / 1024)} KB
              </span>
            </div>
          </div>
        );
      case 'rtf':
        return (
          <div>
            <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>RTF:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'bookmark':
        return (
          <div>
            <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>Bookmark:</span>
            <span>{clip.title || 'Untitled'} - {clip.url}</span>
          </div>
        );
      default:
        return <span>{clip.content}</span>;
    }
  };

  return (
    <li className={styles.clip}>
      <div className={classNames(styles.clipRow, { [styles.light]: isLight })}>
        {/* Row number */}
        <div 
          className={classNames(
            styles.rowNumber,
            { [styles.light]: isLight },
            {
              [styles.currentCopiedClip]: clipCopyIndex === index,
            }
          )}
          onClick={handleRowNumberClick}
          title="Click to copy this clip to clipboard"
        >
          {index + 1}
        </div>
        
        {/* Content area */}
        <div className={classNames(styles.contentArea, { [styles.light]: isLight })}>
          {renderClipContent()}
        </div>
        
        <ClipOptions index={index} />
      </div>
    </li>
  );
};
