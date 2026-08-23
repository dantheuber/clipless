import { memo, useState, useEffect } from 'react';
import { ClipItem } from '../../../providers/clips';
import styles from './Clip.module.css';

/** "412 KB" from a byte count */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The image format from a data URL, upper-cased, or null */
export function imageFormat(dataUrl: string): string | null {
  return dataUrl.startsWith('data:image/')
    ? dataUrl.split(';')[0].split('/')[1].toUpperCase()
    : null;
}

/** The stored size, or an estimate from the thumbnail for clips captured before it was recorded */
export function imageBytes(clip: ClipItem): number {
  if (clip.imageBytes !== undefined) return clip.imageBytes;
  const source = clip.thumbnailDataUrl || clip.content;
  const payload = source.indexOf(',') >= 0 ? source.slice(source.indexOf(',') + 1) : source;
  return Math.round(payload.length * 0.75);
}

/** "1280 x 720, 412 KB", or the size alone for older clips with no recorded dimensions */
export function imageMeta(clip: ClipItem): string {
  const size = formatBytes(imageBytes(clip));
  return clip.imageWidth && clip.imageHeight
    ? `${clip.imageWidth} x ${clip.imageHeight}, ${size}`
    : size;
}

/**
 * An image row (spec 16 rule 6): the thumbnail, a format tag and the dimensions and size.
 * No popover; the reader is the viewer. No chips, no dots, no pins.
 */
export const ImageClip = memo(function ImageClip({ clip }: { clip: ClipItem }) {
  const [hasError, setHasError] = useState(false);
  const displaySrc = clip.thumbnailDataUrl || clip.content;

  // Reset error state when the clip changes (prevents stale error from DOM reuse)
  useEffect(() => {
    setHasError(false);
  }, [displaySrc]);

  const format = imageFormat(displaySrc);

  return (
    <div className={styles.imageLine}>
      {hasError ? (
        <span className={styles.imageMeta}>Invalid image data</span>
      ) : (
        <img
          src={displaySrc}
          alt="Clipboard image preview"
          className={styles.thumb}
          onError={() => setHasError(true)}
        />
      )}
      <span className={styles.lang}>{format ? format.toLowerCase() : 'image'}</span>
      <span className={styles.imageMeta}>{imageMeta(clip)}</span>
    </div>
  );
});
