import { SearchTerm, QuickTool, PatternMatch } from '../../../../../shared/types';

export type TabType = 'searchTerms' | 'tools' | 'templates' | 'test';

export interface DeleteConfirmState {
  show: boolean;
  type: 'searchTerm' | 'tool';
  id: string;
  name: string;
}

export interface QuickClipsState {
  // Search Terms state
  searchTerms: SearchTerm[];
  editingSearchTermId: string | null;
  editingSearchTermName: string;
  editingSearchTermPattern: string;
  expandedSearchTermId: string | null;

  // Tools state
  tools: QuickTool[];
  editingToolId: string | null;
  editingToolName: string;
  editingToolUrl: string;
  editingToolCaptureGroups: string[];
  expandedToolId: string | null;
  availableCaptureGroups: string[];

  // Test state
  testText: string;
  testResults: PatternMatch[];

  // Common state
  deleteConfirm: DeleteConfirmState;
}

export interface QuickClipsActions {
  // Data loading
  loadSearchTerms: () => Promise<void>;
  loadTools: () => Promise<void>;

  // Search Terms actions
  handleCreateSearchTerm: () => Promise<void>;
  handleCreateFromBuiltin: (builtin: SearchTerm) => Promise<void>;
  handleSaveSearchTerm: () => Promise<void>;
  handleCancelSearchTermEdit: () => void;
  handleStartSearchTermEdit: (term: SearchTerm) => void;
  handleDeleteSearchTerm: (id: string) => void;

  // Tools actions
  handleCreateTool: () => Promise<void>;
  handleSaveTool: () => Promise<void>;
  handleCancelToolEdit: () => void;
  handleStartToolEdit: (tool: QuickTool) => void;
  handleDeleteTool: (id: string) => void;
  handleToggleCaptureGroup: (groupName: string) => void;

  // Test actions
  handleTestPattern: () => Promise<void>;

  // Delete confirmation
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;

  // Export/Import
  handleExportConfig: () => Promise<void>;
  handleImportConfig: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  // State setters
  setEditingSearchTermName: (name: string) => void;
  setEditingSearchTermPattern: (pattern: string) => void;
  setExpandedSearchTermId: (id: string | null) => void;
  setEditingToolName: (name: string) => void;
  setEditingToolUrl: (url: string) => void;
  setEditingToolCaptureGroups: (groups: string[]) => void;
  setExpandedToolId: (id: string | null) => void;
  setTestText: (text: string) => void;
}
