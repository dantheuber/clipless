import { memo } from 'react';
import { ClipItem, clipText } from '../../../providers/clips';
import type { ScanResult } from '../../../../../shared/types';
import { CollapsedLine } from './CollapsedLine';
import styles from './Clip.module.css';
import { ClipTag } from './ClipTag';

interface HtmlClipProps {
  clip: ClipItem;
  scan: ScanResult | null;
  searchTerm?: string;
}

export const HtmlClip = memo(function HtmlClip({ clip, scan, searchTerm }: HtmlClipProps) {
  return (
    <span className={styles.editableText} data-testid="clip-line">
      <ClipTag row>html</ClipTag>
      <CollapsedLine text={clipText(clip)} scan={scan} term={searchTerm} />
    </span>
  );
});
