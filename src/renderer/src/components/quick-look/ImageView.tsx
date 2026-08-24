import { useEffect, useState } from 'react';
import type { ClipItem } from '../../../../shared/types';
import styles from './QuickLook.module.css';

interface ImageViewProps {
  clip: ClipItem;
  onInfo: (info: { width: number; height: number }) => void;
}

export function ImageView({ clip, onInfo }: ImageViewProps) {
  const [src, setSrc] = useState<string>(clip.thumbnailDataUrl || clip.content);

  useEffect(() => {
    let cancelled = false;
    setSrc(clip.thumbnailDataUrl || clip.content);
    if (!clip.imageId) return;
    window.api
      .getFullImage(clip.imageId)
      .then((full) => {
        if (!cancelled && full) setSrc(full);
      })
      .catch((error) => console.error('Failed to load full image:', error));
    return () => {
      cancelled = true;
    };
  }, [clip.id, clip.imageId, clip.thumbnailDataUrl, clip.content]);

  return (
    <div className={styles.imagePane} data-testid="ql-image">
      <img
        src={src}
        alt="Clip image"
        onLoad={(event) => {
          const img = event.currentTarget;
          if (src !== clip.thumbnailDataUrl) {
            onInfo({ width: img.naturalWidth, height: img.naturalHeight });
          }
        }}
      />
    </div>
  );
}
