import type { ClipItem } from '../../../../shared/types';
import { EMPTY_SCAN } from '../../providers/scan';
import { Content } from './Content';

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
