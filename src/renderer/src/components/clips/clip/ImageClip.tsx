import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import styles from './Clip.module.css';

interface ImageClipProps {
  clip: ClipItem;
}

export const ImageClip = memo(function ImageClip({ clip }: ImageClipProps) {
  const { isLight } = useTheme();
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [showPopover, setShowPopover] = useState(false);

  const handleImageMouseEnter = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const popoverHeight = 320;
    const popoverWidth = 320;

    let left = rect.right + 16;
    let top = rect.top + rect.height / 2 - popoverHeight / 2;

    if (left + popoverWidth > viewportWidth) {
      left = rect.left - popoverWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }
    if (top + popoverHeight > viewportHeight) {
      top = viewportHeight - popoverHeight - 16;
    }
    if (top < 16) {
      top = 16;
    }

    setPopoverStyle({ left: `${left}px`, top: `${top}px` });
    setShowPopover(true);
  };

  const handleImageMouseLeave = () => {
    setShowPopover(false);
  };

  return (
    <div className={styles.imagePreviewContainer}>
      <img
        src={clip.content}
        alt="Clipboard image preview"
        className={classNames(styles.imagePreview, { [styles.light]: isLight })}
        onMouseEnter={handleImageMouseEnter}
        onMouseLeave={handleImageMouseLeave}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = document.createElement('span');
          fallback.textContent = 'Invalid image data';
          fallback.style.color = isLight ? '#666666' : 'rgb(156 163 175)';
          fallback.style.fontSize = '0.75rem';
          target.parentNode?.appendChild(fallback);
        }}
      />
      {showPopover &&
        createPortal(
          <div
            className={classNames(styles.imagePopover, styles.imagePopoverVisible, {
              [styles.light]: isLight,
            })}
            style={popoverStyle}
          >
            <img
              src={clip.content}
              alt="Large image preview"
              className={classNames(styles.popoverImage, { [styles.light]: isLight })}
            />
          </div>,
          document.body
        )}
      <div className={styles.imageInfo}>
        <span className={classNames(styles.imageFilename, { [styles.light]: isLight })}>
          Image (
          {clip.content.startsWith('data:image/')
            ? clip.content.split(';')[0].split('/')[1].toUpperCase()
            : 'Unknown format'}
          )
        </span>
        <span className={classNames(styles.imageSize, { [styles.light]: isLight })}>
          {Math.round((clip.content.length * 0.75) / 1024)} KB
        </span>
      </div>
    </div>
  );
});
