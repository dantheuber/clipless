import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { SearchTerm, QuickTool, PatternMatch } from '../../../../shared/types';
import { useTheme } from '../../providers/theme';
import { ConfirmDialog } from '../ConfirmDialog';
import { SearchTermsSection, ToolsSection, TestPatternsSection, TabType } from './quickclips';
import styles from './QuickClipsManager.module.css';

// Built-in common patterns
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BUILTIN_PATTERNS = [
  {
    name: 'Email Address',
    pattern: '(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  },
  {
    name: 'IP Address',
    pattern:
      '(?<ipAddress>\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b)',
  },
  {
    name: 'Domain Name',
    pattern: '(?<domainName>\\b[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.[a-zA-Z]{2,}\\b)',
  },
  {
    name: 'Phone Number',
    pattern:
      '(?<phoneNumber>\\b(?:\\+?1[-.]?)?\\(?([0-9]{3})\\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\\b)',
  },
  {
    name: 'URL',
    pattern: '(?<url>https?:\\/\\/[^\\s]+)',
  },
  {
    name: 'MAC Address',
    pattern:
      '(?<macAddress>\\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\\b)',
  },
  {
    name: 'IPv6 Address',
    pattern:
      '(?<ipv6Address>\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b|\\b::1\\b|\\b::ffff:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\b)',
  },
];

export function QuickClipsManager(): React.JSX.Element {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('searchTerms');

  // Search Terms state
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [editingSearchTermId, setEditingSearchTermId] = useState<string | null>(null);
  const [editingSearchTermName, setEditingSearchTermName] = useState('');
  const [editingSearchTermPattern, setEditingSearchTermPattern] = useState('');
  const [expandedSearchTermId, setExpandedSearchTermId] = useState<string | null>(null);

  // Tools state
  const [tools, setTools] = useState<QuickTool[]>([]);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editingToolName, setEditingToolName] = useState('');
  const [editingToolUrl, setEditingToolUrl] = useState('');
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  // Test state
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState<PatternMatch[]>([]);

  // Common state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'searchTerm' | 'tool';
    id: string;
    name: string;
  }>({
    show: false,
    type: 'searchTerm',
    id: '',
    name: '',
  });

  // Load data on mount
  useEffect(() => {
    loadSearchTerms();
    loadTools();
  }, []);

  // Update available capture groups when search terms change
  useEffect(() => {
    const groups = new Set<string>();
    searchTerms.forEach((term) => {
      const matches = term.pattern.match(/\(\?<(\w+)>/g);
      if (matches) {
        matches.forEach((match) => {
          const groupName = match.match(/\(\?<(\w+)>/)?.[1];
          if (groupName) groups.add(groupName);
        });
      }
    });
  }, [searchTerms]);

  // Data loading functions
  const loadSearchTerms = async () => {
    try {
      const loadedTerms = await window.api.searchTermsGetAll();
      setSearchTerms(loadedTerms);
    } catch (error) {
      console.error('Failed to load search terms:', error);
    }
  };

  const loadTools = async () => {
    try {
      const loadedTools = await window.api.quickToolsGetAll();
      setTools(loadedTools);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  // Search Terms handlers
  const handleCreateSearchTerm = async () => {
    try {
      const newTerm = await window.api.searchTermsCreate('New Search Term', '(?<value>.*)');
      setSearchTerms((prev) => [...prev, newTerm]);
      setEditingSearchTermId(newTerm.id);
      setEditingSearchTermName(newTerm.name);
      setEditingSearchTermPattern(newTerm.pattern);
    } catch (error) {
      console.error('Failed to create search term:', error);
    }
  };

  const handleCreateFromBuiltin = async (builtin: (typeof BUILTIN_PATTERNS)[0]) => {
    try {
      const newTerm = await window.api.searchTermsCreate(builtin.name, builtin.pattern);
      setSearchTerms((prev) => [...prev, newTerm]);
    } catch (error) {
      console.error('Failed to create search term from builtin:', error);
    }
  };

  const handleSaveSearchTerm = async () => {
    if (!editingSearchTermId) return;

    try {
      const updatedTerm = await window.api.searchTermsUpdate(editingSearchTermId, {
        name: editingSearchTermName,
        pattern: editingSearchTermPattern,
      });

      setSearchTerms((prev) => prev.map((t) => (t.id === editingSearchTermId ? updatedTerm : t)));
      setEditingSearchTermId(null);
      setEditingSearchTermName('');
      setEditingSearchTermPattern('');
    } catch (error) {
      console.error('Failed to update search term:', error);
    }
  };

  const handleCancelSearchTermEdit = () => {
    setEditingSearchTermId(null);
    setEditingSearchTermName('');
    setEditingSearchTermPattern('');
  };

  const handleStartSearchTermEdit = (term: SearchTerm) => {
    setEditingSearchTermId(term.id);
    setEditingSearchTermName(term.name);
    setEditingSearchTermPattern(term.pattern);
    setExpandedSearchTermId(term.id);
  };

  const handleDeleteSearchTerm = (id: string) => {
    const term = searchTerms.find((t) => t.id === id);
    if (!term) return;

    setDeleteConfirm({
      show: true,
      type: 'searchTerm',
      id,
      name: term.name,
    });
  };

  // Tool handlers
  const handleCreateTool = async () => {
    try {
      const newTool = await window.api.quickToolsCreate(
        'New Tool',
        'https://example.com/?q={email|domainName}',
        []
      );
      setTools((prev) => [...prev, newTool]);
      setEditingToolId(newTool.id);
      setEditingToolName(newTool.name);
      setEditingToolUrl(newTool.url);
    } catch (error) {
      console.error('Failed to create tool:', error);
    }
  };

  const handleSaveTool = async () => {
    if (!editingToolId) return;

    try {
      // Extract capture groups from the URL automatically
      const extractCaptureGroupsFromUrl = (url: string): string[] => {
        const tokenRegex = /\{([^}]+)\}/g;
        const groups = new Set<string>();

        let match;
        while ((match = tokenRegex.exec(url)) !== null) {
          const tokenContent = match[1];
          // Split by pipe to handle multi-group tokens
          const captureGroups = tokenContent.split('|').map((g) => g.trim());
          captureGroups.forEach((group) => groups.add(group));
        }

        return Array.from(groups);
      };

      const detectedCaptureGroups = extractCaptureGroupsFromUrl(editingToolUrl);

      const updatedTool = await window.api.quickToolsUpdate(editingToolId, {
        name: editingToolName,
        url: editingToolUrl,
        captureGroups: detectedCaptureGroups,
      });

      setTools((prev) => prev.map((t) => (t.id === editingToolId ? updatedTool : t)));
      setEditingToolId(null);
      setEditingToolName('');
      setEditingToolUrl('');
    } catch (error) {
      console.error('Failed to update tool:', error);
    }
  };

  const handleCancelToolEdit = () => {
    setEditingToolId(null);
    setEditingToolName('');
    setEditingToolUrl('');
  };

  const handleStartToolEdit = (tool: QuickTool) => {
    setEditingToolId(tool.id);
    setEditingToolName(tool.name);
    setEditingToolUrl(tool.url);
    setExpandedToolId(tool.id);
  };

  const handleDeleteTool = (id: string) => {
    const tool = tools.find((t) => t.id === id);
    if (!tool) return;

    setDeleteConfirm({
      show: true,
      type: 'tool',
      id,
      name: tool.name,
    });
  };

  // Test handlers
  const handleTestPattern = async () => {
    if (!testText.trim()) return;

    try {
      const results = await window.api.quickClipsScanText(testText);
      setTestResults(results);
    } catch (error) {
      console.error('Failed to test patterns:', error);
      setTestResults([]);
    }
  };

  // Delete confirmation
  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;

    try {
      if (type === 'searchTerm') {
        await window.api.searchTermsDelete(id);
        setSearchTerms((prev) => prev.filter((t) => t.id !== id));
        if (editingSearchTermId === id) {
          handleCancelSearchTermEdit();
        }
      } else {
        await window.api.quickToolsDelete(id);
        setTools((prev) => prev.filter((t) => t.id !== id));
        if (editingToolId === id) {
          handleCancelToolEdit();
        }
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
    } finally {
      setDeleteConfirm({ show: false, type: 'searchTerm', id: '', name: '' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, type: 'searchTerm', id: '', name: '' });
  };

  // Export/Import handlers
  const handleExportConfig = async () => {
    try {
      const config = await window.api.quickClipsExportConfig();
      const dataStr = JSON.stringify(config, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'quick-clips-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export config:', error);
    }
  };

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);
      await window.api.quickClipsImportConfig(config);

      // Reload data
      await loadSearchTerms();
      await loadTools();

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Failed to import config:', error);
      alert('Failed to import configuration. Please check the file format.');
    }
  };

  return (
    <div className={classNames(styles.container, { [styles.light]: isLight })}>
      <div className={classNames(styles.header, { [styles.light]: isLight })}>
        <div className={styles.headerActions}>
          <input
            type="file"
            accept=".json"
            onChange={handleImportConfig}
            style={{ display: 'none' }}
            id="import-config"
          />
          <label
            htmlFor="import-config"
            className={classNames(styles.importButton, { [styles.light]: isLight })}
          >
            Import Config
          </label>
          <button
            className={classNames(styles.exportButton, { [styles.light]: isLight })}
            onClick={handleExportConfig}
          >
            Export Config
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className={classNames(styles.subTabsContainer, { [styles.light]: isLight })}>
        <div className={styles.subTabs}>
          <button
            className={classNames(
              styles.subTab,
              { [styles.subTabActive]: activeTab === 'searchTerms' },
              { [styles.light]: isLight }
            )}
            onClick={() => setActiveTab('searchTerms')}
          >
            Search Terms
          </button>
          <button
            className={classNames(
              styles.subTab,
              { [styles.subTabActive]: activeTab === 'tools' },
              { [styles.light]: isLight }
            )}
            onClick={() => setActiveTab('tools')}
          >
            Tools
          </button>
          <button
            className={classNames(
              styles.subTab,
              { [styles.subTabActive]: activeTab === 'test' },
              { [styles.light]: isLight }
            )}
            onClick={() => setActiveTab('test')}
          >
            Test Patterns
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'searchTerms' && (
        <SearchTermsSection
          searchTerms={searchTerms}
          editingSearchTermId={editingSearchTermId}
          editingSearchTermName={editingSearchTermName}
          editingSearchTermPattern={editingSearchTermPattern}
          expandedSearchTermId={expandedSearchTermId}
          onCreateSearchTerm={handleCreateSearchTerm}
          onCreateFromBuiltin={handleCreateFromBuiltin}
          onSaveSearchTerm={handleSaveSearchTerm}
          onCancelSearchTermEdit={handleCancelSearchTermEdit}
          onStartSearchTermEdit={handleStartSearchTermEdit}
          onDeleteSearchTerm={handleDeleteSearchTerm}
          onEditingSearchTermNameChange={setEditingSearchTermName}
          onEditingSearchTermPatternChange={setEditingSearchTermPattern}
          onExpandedSearchTermIdChange={setExpandedSearchTermId}
        />
      )}
      {activeTab === 'tools' && (
        <ToolsSection
          tools={tools}
          editingToolId={editingToolId}
          editingToolName={editingToolName}
          editingToolUrl={editingToolUrl}
          expandedToolId={expandedToolId}
          onCreateTool={handleCreateTool}
          onSaveTool={handleSaveTool}
          onCancelToolEdit={handleCancelToolEdit}
          onStartToolEdit={handleStartToolEdit}
          onDeleteTool={handleDeleteTool}
          onEditingToolNameChange={setEditingToolName}
          onEditingToolUrlChange={setEditingToolUrl}
          onExpandedToolIdChange={setExpandedToolId}
        />
      )}
      {activeTab === 'test' && (
        <TestPatternsSection
          testText={testText}
          testResults={testResults}
          onTestTextChange={setTestText}
          onTestPattern={handleTestPattern}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={`Delete ${deleteConfirm.type === 'searchTerm' ? 'Search Term' : 'Tool'}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        type="danger"
      />
    </div>
  );
}
