import { memo, useState, useEffect } from 'react';
import { ClipItem } from '../../../providers/clips';
import { imageFormat, imageMeta } from './imageMeta';
import styles from './Clip.module.css';
import { ClipTag } from './ClipTag';

export const ImageClip = memo(function ImageClip({ clip }: { clip: ClipItem }) {
  const [hasError, setHasError] = useState(false);
  const displaySrc = clip.thumbnailDataUrl || clip.content;

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
      <ClipTag row>{format ? format.toLowerCase() : 'image'}</ClipTag>
      <span className={styles.imageMeta}>{imageMeta(clip)}</span>
    </div>
  );
});
