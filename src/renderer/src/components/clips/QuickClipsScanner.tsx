import React, { useState, useEffect, useMemo, useCallback } from 'react';
import classNames from 'classnames';
import { PatternMatch, QuickTool, Template } from '../../../../shared/types';
import { useTheme } from '../../providers/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './QuickClipsScanner.module.css';

interface CaptureItem {
  groupName: string;
  value: string;
  searchTermId: string;
  uniqueKey: string;
}

interface QuickClipsScannerProps {
  isOpen: boolean;
  onClose?: () => void;
  clipContent: string;
}

/**
 * Extract named (non-positional) tokens from template content.
 */
function extractNamedTokens(content: string): string[] {
  const tokens: string[] = [];
  const tokenRegex = /\{(\w+)\}/g;
  let match;
  while ((match = tokenRegex.exec(content)) !== null) {
    const token = match[1];
    if (!/^c\d+$/.test(token) && !tokens.includes(token)) {
      tokens.push(token);
    }
  }
  return tokens;
}

/**
 * Check if a template has any positional tokens ({c1}, {c2}, etc.)
 */
function hasPositionalTokens(content: string): boolean {
  return /\{c\d+\}/.test(content);
}

/**
 * Extract all token names from template content for display.
 */
function extractAllTokens(content: string): string[] {
  const tokens: string[] = [];
  const tokenRegex = /\{(\w+)\}/g;
  let match;
  while ((match = tokenRegex.exec(content)) !== null) {
    if (!tokens.includes(match[1])) {
      tokens.push(match[1]);
    }
  }
  return tokens;
}

type AccordionSection = 'tools' | 'matchedTemplates' | 'clipTemplates';

export function QuickClipsScanner({
  isOpen,
  onClose,
  clipContent,
}: QuickClipsScannerProps): React.JSX.Element {
  const { isLight } = useTheme();
  const [, setMatches] = useState<PatternMatch[]>([]);
  const [captureItems, setCaptureItems] = useState<CaptureItem[]>([]);
  const [tools, setTools] = useState<QuickTool[]>([]);
  const [selectedCaptureItems, setSelectedCaptureItems] = useState<Set<string>>(new Set());
  const [availableTools, setAvailableTools] = useState<QuickTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [matchedTemplates, setMatchedTemplates] = useState<Template[]>([]);
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Set<AccordionSection>>(new Set());
  const [accordionInitialized, setAccordionInitialized] = useState(false);

  // Clip-only templates (positional tokens only, no named tokens)
  const clipTemplates = useMemo(() => {
    return templates.filter((t) => {
      const named = extractNamedTokens(t.content);
      return named.length === 0 && hasPositionalTokens(t.content);
    });
  }, [templates]);

  // Auto-expand the first non-empty section once data is ready
  useEffect(() => {
    if (accordionInitialized) return;
    if (loading) return;

    const hasTools = availableTools.length > 0;
    const hasMatched = matchedTemplates.length > 0;
    const hasClip = clipTemplates.length > 0;

    // Wait until at least templates have loaded
    if (templates.length === 0 && !loading) {
      // Templates might genuinely be empty — only wait if we haven't tried loading yet
      // We'll initialize once we have tools loaded too
      if (tools.length === 0) return;
    }

    const initial = new Set<AccordionSection>();
    if (hasTools) {
      initial.add('tools');
    } else if (hasMatched) {
      initial.add('matchedTemplates');
    } else if (hasClip) {
      initial.add('clipTemplates');
    }

    setExpandedSections(initial);
    setAccordionInitialized(true);
  }, [
    availableTools,
    matchedTemplates,
    clipTemplates,
    templates,
    tools,
    loading,
    accordionInitialized,
  ]);

  // When matched templates become available, auto-expand that section
  useEffect(() => {
    if (!accordionInitialized) return;
    if (matchedTemplates.length > 0) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.add('matchedTemplates');
        next.delete('clipTemplates');
        return next;
      });
    }
  }, [matchedTemplates, accordionInitialized]);

  const toggleSection = (section: AccordionSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      window.api.closeToolsLauncher();
    }
  }, [onClose]);

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    return () => {};
  }, [isOpen, handleClose]);

  const scanContent = useCallback(async () => {
    setLoading(true);
    try {
      const scanResults = await window.api.quickClipsScanText(clipContent);
      setMatches(scanResults);

      const captureMap = new Map<string, CaptureItem>();

      scanResults.forEach((match) => {
        Object.entries(match.captures).forEach(([groupName, value]) => {
          const uniqueKey = `${groupName}-${value}`;
          if (!captureMap.has(uniqueKey)) {
            captureMap.set(uniqueKey, {
              groupName,
              value: String(value),
              searchTermId: match.searchTermId,
              uniqueKey,
            });
          }
        });
      });

      const items = Array.from(captureMap.values());
      setCaptureItems(items);
      setSelectedCaptureItems(new Set(items.map((item) => item.uniqueKey)));
    } catch (error) {
      console.error('Failed to scan content:', error);
      setMatches([]);
      setCaptureItems([]);
    } finally {
      setLoading(false);
    }
  }, [clipContent]);

  const loadTools = useCallback(async () => {
    try {
      const loadedTools = await window.api.quickToolsGetAll();
      setTools(loadedTools);
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const loadedTemplates = await window.api.templatesGetAll();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  }, []);

  const updateAvailableTools = useCallback(() => {
    const selectedCaptureGroups = new Set<string>();

    captureItems.forEach((item) => {
      if (selectedCaptureItems.has(item.uniqueKey)) {
        selectedCaptureGroups.add(item.groupName);
      }
    });

    const compatibleTools = tools.filter((tool) =>
      tool.captureGroups.some((group) => selectedCaptureGroups.has(group))
    );

    setAvailableTools(compatibleTools);

    const availableToolIds = new Set(compatibleTools.map((tool) => tool.id));
    setSelectedTools((prev) => new Set([...prev].filter((id) => availableToolIds.has(id))));
  }, [captureItems, tools, selectedCaptureItems]);

  const updateMatchedTemplates = useCallback(() => {
    const selectedCaptureGroups = new Set<string>();

    captureItems.forEach((item) => {
      if (selectedCaptureItems.has(item.uniqueKey)) {
        selectedCaptureGroups.add(item.groupName);
      }
    });

    const compatible = templates.filter((template) => {
      const namedTokens = extractNamedTokens(template.content);
      if (namedTokens.length === 0) return false;
      return namedTokens.every((token) => selectedCaptureGroups.has(token));
    });

    setMatchedTemplates(compatible);
  }, [captureItems, templates, selectedCaptureItems]);

  // Scan the clip content when modal opens
  useEffect(() => {
    if (isOpen && clipContent) {
      scanContent();
    }
  }, [isOpen, clipContent, scanContent]);

  // Load available tools and templates
  useEffect(() => {
    if (isOpen) {
      loadTools();
      loadTemplates();
      setAccordionInitialized(false);
    }
  }, [isOpen, loadTools, loadTemplates]);

  // Update available tools when capture items change
  useEffect(() => {
    if (captureItems.length > 0 && tools.length > 0) {
      updateAvailableTools();
    }
  }, [captureItems, tools, selectedCaptureItems, updateAvailableTools]);

  // Update matched templates when capture items change
  useEffect(() => {
    if (captureItems.length > 0 && templates.length > 0) {
      updateMatchedTemplates();
    }
  }, [captureItems, templates, selectedCaptureItems, updateMatchedTemplates]);

  const handleCaptureItemToggle = (uniqueKey: string) => {
    const newSelected = new Set(selectedCaptureItems);
    if (newSelected.has(uniqueKey)) {
      newSelected.delete(uniqueKey);
    } else {
      newSelected.add(uniqueKey);
    }
    setSelectedCaptureItems(newSelected);
  };

  const handleToolToggle = (toolId: string) => {
    const newSelected = new Set(selectedTools);
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId);
    } else {
      newSelected.add(toolId);
    }
    setSelectedTools(newSelected);
  };

  const handleTemplateSelect = async (template: Template) => {
    setGeneratingTemplateId(template.id);
    try {
      const selectedCaptures: Record<string, string> = {};
      captureItems
        .filter((item) => selectedCaptureItems.has(item.uniqueKey))
        .forEach((item) => {
          selectedCaptures[item.groupName] = item.value;
        });

      const storedClips = await window.api.storageGetClips();
      const clipContents = storedClips.map((c) => c.clip?.content || '');

      const generatedText = await window.api.templatesGenerateText(
        template.id,
        clipContents,
        selectedCaptures
      );
      await window.api.setClipboardText(generatedText);
      handleClose();
    } catch (error) {
      console.error('Failed to generate text from template:', error);
    } finally {
      setGeneratingTemplateId(null);
    }
  };

  const handleOpenTools = async () => {
    if (selectedCaptureItems.size === 0 || selectedTools.size === 0) return;

    try {
      const selectedCaptures: Record<string, string> = {};

      captureItems
        .filter((item) => selectedCaptureItems.has(item.uniqueKey))
        .forEach((item) => {
          selectedCaptures[item.groupName] = item.value;
        });

      const combinedMatch: PatternMatch = {
        searchTermId: 'combined',
        searchTermName: 'Combined Selection',
        captures: selectedCaptures,
      };

      await window.api.quickClipsOpenTools([combinedMatch], Array.from(selectedTools));
      handleClose();
    } catch (error) {
      console.error('Failed to open tools:', error);
    }
  };

  if (!isOpen) return <></>;

  const hasAnyRightContent =
    availableTools.length > 0 || matchedTemplates.length > 0 || clipTemplates.length > 0;
  const showTwoColumns = captureItems.length > 0 && hasAnyRightContent;
  // If no patterns but we have clip templates, show single-column with just templates
  const showClipTemplatesOnly = captureItems.length === 0 && clipTemplates.length > 0;

  return (
    <div className={classNames(styles.modal, { [styles.light]: isLight }, styles.standalone)}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={classNames(styles.title, { [styles.light]: isLight })}>Tools Launcher</h2>
          <p className={classNames(styles.subtitle, { [styles.light]: isLight })}>
            Press Esc or click close to exit
          </p>
        </div>
        <button
          className={classNames(styles.closeButton, { [styles.light]: isLight })}
          onClick={handleClose}
        >
          <FontAwesomeIcon icon="times" />
        </button>
      </div>

      <div
        className={classNames(styles.content, { [styles.light]: isLight })}
        style={{
          flexDirection: loading || (!showTwoColumns && !showClipTemplatesOnly) ? 'column' : 'row',
          justifyContent:
            loading || (!showTwoColumns && !showClipTemplatesOnly) ? 'center' : 'flex-start',
          alignItems: loading || (!showTwoColumns && !showClipTemplatesOnly) ? 'center' : 'stretch',
        }}
      >
        {loading ? (
          <div className={classNames(styles.loading, { [styles.light]: isLight })}>
            <FontAwesomeIcon icon="spinner" spin />
            <span>Scanning content...</span>
          </div>
        ) : showClipTemplatesOnly ? (
          /* No patterns found, but clip templates exist — show them */
          <div style={{ width: '100%' }}>
            <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
              <FontAwesomeIcon icon="search" className={styles.emptyIcon} />
              <p>No patterns found in this clip content.</p>
            </div>
            <div style={{ padding: '0 1rem' }}>
              <button
                className={classNames(styles.accordionHeader, { [styles.light]: isLight })}
                onClick={() => toggleSection('clipTemplates')}
              >
                <FontAwesomeIcon
                  icon="chevron-right"
                  className={classNames(styles.accordionChevron, {
                    [styles.accordionChevronOpen]: expandedSections.has('clipTemplates'),
                  })}
                />
                <FontAwesomeIcon icon="file-lines" className={styles.accordionIcon} />
                <span>Clip Templates ({clipTemplates.length})</span>
              </button>
              {expandedSections.has('clipTemplates') && (
                <div className={styles.accordionBody}>
                  {renderTemplateList(clipTemplates, false)}
                </div>
              )}
            </div>
          </div>
        ) : captureItems.length === 0 ? (
          <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
            <FontAwesomeIcon icon="search" className={styles.emptyIcon} />
            <p>No patterns found in this clip content.</p>
            <p className={styles.emptyHint}>
              Create search terms in Settings &gt; Tools to detect patterns.
            </p>
          </div>
        ) : (
          <>
            {/* Left Side - Capture Items Section */}
            <div className={classNames(styles.section, styles.leftSection)}>
              <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
                Found Patterns ({captureItems.length})
              </h3>
              <div className={styles.matchesList}>
                {captureItems.map((item) => {
                  const isSelected = selectedCaptureItems.has(item.uniqueKey);

                  return (
                    <div
                      key={item.uniqueKey}
                      className={classNames(
                        styles.matchItem,
                        { [styles.light]: isLight },
                        { [styles.selected]: isSelected }
                      )}
                    >
                      <label className={styles.matchLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCaptureItemToggle(item.uniqueKey)}
                          className={styles.checkbox}
                        />
                        <div className={styles.matchDetails}>
                          <div className={styles.matchCaptures}>
                            <div className={styles.capture}>
                              <span
                                className={classNames(styles.captureGroup, {
                                  [styles.light]: isLight,
                                })}
                              >
                                {item.groupName}:
                              </span>
                              <span
                                className={classNames(styles.captureValue, {
                                  [styles.light]: isLight,
                                })}
                              >
                                {item.value}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side - Accordion Sections */}
            <div className={classNames(styles.section, styles.rightSection)}>
              {/* Available Tools */}
              {availableTools.length > 0 && (
                <div className={styles.accordionSection}>
                  <button
                    className={classNames(styles.accordionHeader, { [styles.light]: isLight })}
                    onClick={() => toggleSection('tools')}
                  >
                    <FontAwesomeIcon
                      icon="chevron-right"
                      className={classNames(styles.accordionChevron, {
                        [styles.accordionChevronOpen]: expandedSections.has('tools'),
                      })}
                    />
                    <FontAwesomeIcon icon="wrench" className={styles.accordionIcon} />
                    <span>Available Tools ({availableTools.length})</span>
                  </button>
                  {expandedSections.has('tools') && (
                    <div className={styles.accordionBody}>
                      <div className={styles.toolsList}>
                        {availableTools.map((tool) => {
                          const isSelected = selectedTools.has(tool.id);

                          return (
                            <div
                              key={tool.id}
                              className={classNames(
                                styles.toolItem,
                                { [styles.light]: isLight },
                                { [styles.selected]: isSelected }
                              )}
                            >
                              <label className={styles.toolLabel}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToolToggle(tool.id)}
                                  className={styles.checkbox}
                                />
                                <div className={styles.toolDetails}>
                                  <div
                                    className={classNames(styles.toolName, {
                                      [styles.light]: isLight,
                                    })}
                                  >
                                    {tool.name}
                                  </div>
                                  <div
                                    className={classNames(styles.toolUrl, {
                                      [styles.light]: isLight,
                                    })}
                                  >
                                    {tool.url}
                                  </div>
                                  <div
                                    className={classNames(styles.toolGroups, {
                                      [styles.light]: isLight,
                                    })}
                                  >
                                    Supports: {tool.captureGroups.join(', ')}
                                  </div>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Matched Templates */}
              {matchedTemplates.length > 0 && (
                <div className={styles.accordionSection}>
                  <button
                    className={classNames(styles.accordionHeader, { [styles.light]: isLight })}
                    onClick={() => toggleSection('matchedTemplates')}
                  >
                    <FontAwesomeIcon
                      icon="chevron-right"
                      className={classNames(styles.accordionChevron, {
                        [styles.accordionChevronOpen]: expandedSections.has('matchedTemplates'),
                      })}
                    />
                    <FontAwesomeIcon icon="file-lines" className={styles.accordionIcon} />
                    <span>Matched Templates ({matchedTemplates.length})</span>
                  </button>
                  {expandedSections.has('matchedTemplates') && (
                    <div className={styles.accordionBody}>
                      {renderTemplateList(matchedTemplates, true)}
                    </div>
                  )}
                </div>
              )}

              {/* Clip Templates (positional-only) */}
              {clipTemplates.length > 0 && (
                <div className={styles.accordionSection}>
                  <button
                    className={classNames(styles.accordionHeader, { [styles.light]: isLight })}
                    onClick={() => toggleSection('clipTemplates')}
                  >
                    <FontAwesomeIcon
                      icon="chevron-right"
                      className={classNames(styles.accordionChevron, {
                        [styles.accordionChevronOpen]: expandedSections.has('clipTemplates'),
                      })}
                    />
                    <FontAwesomeIcon icon="clipboard" className={styles.accordionIcon} />
                    <span>Clip Templates ({clipTemplates.length})</span>
                  </button>
                  {expandedSections.has('clipTemplates') && (
                    <div className={styles.accordionBody}>
                      {renderTemplateList(clipTemplates, false)}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state when no right-side content */}
              {!hasAnyRightContent && (
                <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
                  <FontAwesomeIcon icon="wrench" className={styles.emptyIcon} />
                  <p>No tools or templates available.</p>
                  <p className={styles.emptyHint}>
                    Create tools or templates in Settings &gt; Tools.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {captureItems.length > 0 && (
        <div className={classNames(styles.footer, { [styles.light]: isLight })}>
          <div className={styles.stats}>
            <span className={classNames(styles.statText, { [styles.light]: isLight })}>
              {selectedCaptureItems.size} patterns, {selectedTools.size} tools selected
            </span>
          </div>
          <div className={styles.actions}>
            <button
              className={classNames(styles.cancelButton, { [styles.light]: isLight })}
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className={classNames(styles.openButton, { [styles.light]: isLight })}
              onClick={handleOpenTools}
              disabled={selectedCaptureItems.size === 0 || selectedTools.size === 0}
            >
              Open Tools
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function renderTemplateList(templateList: Template[], showNamedTokens: boolean) {
    return (
      <div className={styles.toolsList}>
        {templateList.map((template) => (
          <div
            key={template.id}
            className={classNames(styles.toolItem, { [styles.light]: isLight })}
          >
            <button
              className={classNames(styles.toolLabel, styles.templateButton)}
              onClick={() => handleTemplateSelect(template)}
              disabled={generatingTemplateId === template.id}
            >
              <div className={styles.toolDetails}>
                <div
                  className={classNames(styles.toolName, {
                    [styles.light]: isLight,
                  })}
                >
                  {generatingTemplateId === template.id ? (
                    <FontAwesomeIcon icon="spinner" spin />
                  ) : (
                    <FontAwesomeIcon icon="file-lines" />
                  )}{' '}
                  {template.name}
                </div>
                <div
                  className={classNames(styles.toolGroups, {
                    [styles.light]: isLight,
                  })}
                >
                  Tokens:{' '}
                  {showNamedTokens
                    ? extractAllTokens(template.content).join(', ')
                    : extractAllTokens(template.content)
                        .filter((t) => /^c\d+$/.test(t))
                        .map((t) => `{${t}}`)
                        .join(', ')}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    );
  }
}
