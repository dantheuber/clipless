import { memo } from 'react';
import { ClipItem, clipText } from '../../../providers/clips';
import type { ScanResult } from '../../../../../shared/types';
import { CollapsedLine } from './CollapsedLine';
import styles from './Clip.module.css';

interface HtmlClipProps {
  clip: ClipItem;
  scan: ScanResult | null;
  searchTerm?: string;
}

/**
 * An html row (spec 16 rule 6): a type tag and the extracted text, never the markup.
 */
export const HtmlClip = memo(function HtmlClip({ clip, scan, searchTerm }: HtmlClipProps) {
  return (
    <span className={styles.editableText} data-testid="clip-line">
      <span className={styles.lang}>html</span>
      <CollapsedLine text={clipText(clip)} scan={scan} term={searchTerm} />
    </span>
  );
});
