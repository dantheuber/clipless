import type { Mock } from 'vitest';
import type { ClipItem } from '../../../../shared/types';
import type { QuickLookState } from '../../providers/clips/quickLook';

export interface QuickLookTestState {
  quickLook: QuickLookState;
  clips: ClipItem[];
  pinned: Set<string>;
  togglePins: Mock;
  setPins: Mock;
  updateClip: Mock;
  copyClipToClipboard: Mock;
  closeQuickLook: Mock;
  walkQuickLook: Mock;
  setView: Mock;
  setEditing: Mock;
  toggleWrap: Mock;
  pendingScan: boolean;
  tools: { id: string; name: string; url: string }[];
  templates: {
    id: string;
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    order: number;
  }[];
  toast: Mock;
  short: boolean;
  narrow: boolean;
  codeDetection: boolean;
}

export interface QuickLookCaseContext {
  state: QuickLookTestState;
  api: () => Record<string, Mock>;
  openOn: (id: string) => void;
}
