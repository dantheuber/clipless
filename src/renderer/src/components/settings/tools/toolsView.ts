import type { TermDraft } from './SearchTermEditor';
import type { Selection } from './ListPane';
import type { ToolsKind } from './model';

export type ToolsView =
  | { mode: 'overview' }
  | { mode: 'item'; sel: Selection; tab: 'edit' | 'uses' }
  | { mode: 'start'; kind: ToolsKind; draft: TermDraft | null };
