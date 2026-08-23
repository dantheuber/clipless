import { memo } from 'react';
import { ClipItem } from '../../../providers/clips';
import type { ScanResult } from '../../../../../shared/types';
import { CollapsedLine } from './CollapsedLine';
import styles from './Clip.module.css';

interface BookmarkClipProps {
  clip: ClipItem;
  scan: ScanResult | null;
  searchTerm?: string;
}

/**
 * A bookmark row (spec 16 rule 6): a link tag, the title plain, then the URL. The scan
 * runs on title plus URL, so a url search term puts a chip on the URL.
 */
export const BookmarkClip = memo(function BookmarkClip({
  clip,
  scan,
  searchTerm,
}: BookmarkClipProps) {
  const title = clip.title || 'Untitled';
  const url = clip.url || clip.content;
  // clipText is `${title}\n${url}`; the scan's offsets are in that text
  const text = `${clip.title ?? ''}\n${url}`;
  return (
    <span className={styles.editableText} data-testid="clip-line">
      <span className={styles.lang}>link</span>
      <span className={styles.bookmarkTitle}>{title}</span>
      <span className={styles.bookmarkUrl}>
        <CollapsedLine text={text} scan={scan} term={searchTerm} />
      </span>
    </span>
  );
});
