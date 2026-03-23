import { memo, useState, useEffect, useRef, useCallback } from 'react';
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
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const fullImageCache = useRef<Map<string, string>>(new Map());

  // Determine display source: use thumbnail if available, otherwise content (legacy inline)
  const displaySrc = clip.thumbnailDataUrl || clip.content;
  // For size display, use thumbnail length as approximation or content length for legacy
  const sizeSource = clip.thumbnailDataUrl || clip.content;

  // Reset error state when the clip changes (prevents stale error from DOM reuse)
  useEffect(() => {
    setHasError(false);
  }, [displaySrc]);

  const loadFullImage = useCallback(async (imageId: string) => {
    // Check cache first
    const cached = fullImageCache.current.get(imageId);
    if (cached) {
      setFullImageUrl(cached);
      return;
    }

    // Load via IPC
    if (window.api?.getFullImage) {
      try {
        const fullUrl = await window.api.getFullImage(imageId);
        if (fullUrl) {
          fullImageCache.current.set(imageId, fullUrl);
          setFullImageUrl(fullUrl);
        }
      } catch (error) {
        console.error('Failed to load full image:', error);
      }
    }
  }, []);

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

    // Load full image for the popover if this is an imageId-backed clip
    if (clip.imageId) {
      loadFullImage(clip.imageId);
    }
  };

  const handleImageMouseLeave = () => {
    setShowPopover(false);
  };

  // Popover image source: prefer loaded full image, fall back to content (for legacy inline clips)
  const popoverSrc = clip.imageId ? fullImageUrl || displaySrc : clip.content;

  // Determine format from content or thumbnail
  const formatSource = clip.thumbnailDataUrl || clip.content;
  const format = formatSource.startsWith('data:image/')
    ? formatSource.split(';')[0].split('/')[1].toUpperCase()
    : 'Unknown format';

  return (
    <div className={styles.imagePreviewContainer}>
      {hasError ? (
        <span
          style={{
            color: isLight ? '#666666' : 'rgb(156 163 175)',
            fontSize: '0.75rem',
          }}
        >
          Invalid image data
        </span>
      ) : (
        <img
          src={displaySrc}
          alt="Clipboard image preview"
          className={classNames(styles.imagePreview, { [styles.light]: isLight })}
          onMouseEnter={handleImageMouseEnter}
          onMouseLeave={handleImageMouseLeave}
          onError={() => setHasError(true)}
        />
      )}
      {showPopover &&
        createPortal(
          <div
            className={classNames(styles.imagePopover, styles.imagePopoverVisible, {
              [styles.light]: isLight,
            })}
            style={popoverStyle}
          >
            <img
              src={popoverSrc || displaySrc}
              alt="Large image preview"
              className={classNames(styles.popoverImage, { [styles.light]: isLight })}
            />
          </div>,
          document.body
        )}
      <div className={styles.imageInfo}>
        <span className={classNames(styles.imageFilename, { [styles.light]: isLight })}>
          Image ({format})
        </span>
        <span className={classNames(styles.imageSize, { [styles.light]: isLight })}>
          {Math.round((sizeSource.length * 0.75) / 1024)} KB
        </span>
      </div>
    </div>
  );
});
