import { memo } from 'react';
import { ClipItem } from '../../../providers/clips';
import type { ScanResult } from '../../../../../shared/types';
import { CollapsedLine } from './CollapsedLine';
import styles from './Clip.module.css';
import { ClipTag } from './ClipTag';

interface BookmarkClipProps {
  clip: ClipItem;
  scan: ScanResult | null;
  searchTerm?: string;
}

export const BookmarkClip = memo(function BookmarkClip({
  clip,
  scan,
  searchTerm,
}: BookmarkClipProps) {
  const title = clip.title || 'Untitled';
  const url = clip.url || clip.content;
  const text = `${clip.title ?? ''}\n${url}`;
  return (
    <span className={styles.editableText} data-testid="clip-line">
      <ClipTag row>link</ClipTag>
      <span className={styles.bookmarkTitle}>{title}</span>
      <span className={styles.bookmarkUrl}>
        <CollapsedLine text={text} scan={scan} term={searchTerm} />
      </span>
    </span>
  );
});
