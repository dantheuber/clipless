import type { ClipItem } from '../../../shared/types';
import { useScanIndex } from './scan';

export function Row({ clip: item }: { clip: ClipItem }) {
  const scan = useScanIndex().getScan(item);
  return (
    <div data-testid={`row-${item.id}`}>
      {scan === null
        ? 'loading'
        : scan.matches.length > 0
          ? `chips:${scan.matches.length}`
          : 'none'}
    </div>
  );
}
