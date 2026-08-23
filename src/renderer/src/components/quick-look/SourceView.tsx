import type { ClipItem } from '../../../../shared/types';
import { EMPTY_SCAN } from '../../providers/scan';
import { Content } from './Content';

/**
 * The raw markup of an html or rtf clip (spec 16 rule 6): the same lines and gutter as
 * the text view, no chips, no pins.
 */
export function SourceView({ clip, wrap }: { clip: ClipItem; wrap: boolean }) {
  return (
    <Content
      text={clip.content}
      language={clip.type === 'html' ? 'markup' : null}
      scan={EMPTY_SCAN}
      wrap={wrap}
      litKey={null}
    />
  );
}
