import type { GroupColours } from '../../../../../shared/types';
import { Bucket } from './Bucket';

export interface ColourBucketTarget {
  group: string;
  anchor: HTMLElement;
}

interface ColourBucketProps {
  target: ColourBucketTarget | null;
  groups: readonly string[];
  slotFor: (group: string) => number;
  groupColours: GroupColours;
  onPickColour: (group: string, slot: number | null) => void;
  onClose: () => void;
}

export function ColourBucket({
  target,
  groups,
  slotFor,
  groupColours,
  onPickColour,
  onClose,
}: ColourBucketProps) {
  if (!target) return null;
  return (
    <Bucket
      group={target.group}
      others={groups.filter((group) => group !== target.group)}
      slotFor={slotFor}
      groupColours={groupColours}
      anchor={target.anchor}
      onPick={(slot) => {
        onPickColour(target.group, slot);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
