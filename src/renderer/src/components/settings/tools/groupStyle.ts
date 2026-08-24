import type { CSSProperties } from 'react';

export function groupStyle(slot: number): CSSProperties {
  return { '--gc': `var(--slot-${slot})` } as CSSProperties;
}
