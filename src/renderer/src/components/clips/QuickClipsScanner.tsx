import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { PatternMatch, QuickTool } from '../../../../shared/types';
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
  onClose: () => void;
  clipContent: string;
}

export function QuickClipsScanner({
  isOpen,
  onClose,
  clipContent,
}: QuickClipsScannerProps): React.JSX.Element {
  const { isLight } = useTheme();
  const [matches, setMatches] = useState<PatternMatch[]>([]);
  const [captureItems, setCaptureItems] = useState<CaptureItem[]>([]);
  const [tools, setTools] = useState<QuickTool[]>([]);
  const [selectedCaptureItems, setSelectedCaptureItems] = useState<Set<string>>(new Set());
  const [availableTools, setAvailableTools] = useState<QuickTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    // Return empty cleanup function for when not open
    return () => {};
  }, [isOpen, onClose]);

  // Scan the clip content when modal opens
  useEffect(() => {
    if (isOpen && clipContent) {
      scanContent();
    }
  }, [isOpen, clipContent]);

  // Load available tools
  useEffect(() => {
    if (isOpen) {
      loadTools();
    }
  }, [isOpen]);

  // Update available tools when capture items or selected capture items change
  useEffect(() => {
    if (captureItems.length > 0 && tools.length > 0) {
      updateAvailableTools();
    }
  }, [captureItems, tools, selectedCaptureItems]);

  const scanContent = async () => {
    setLoading(true);
    try {
      const scanResults = await window.api.quickClipsScanText(clipContent);
      setMatches(scanResults);

      // Extract individual capture items and deduplicate
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

      // Auto-select all capture items initially
      setSelectedCaptureItems(new Set(items.map((item) => item.uniqueKey)));
    } catch (error) {
      console.error('Failed to scan content:', error);
      setMatches([]);
      setCaptureItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const loadedTools = await window.api.quickToolsGetAll();
      setTools(loadedTools);
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    }
  };

  const updateAvailableTools = () => {
    // Get all capture group names from selected capture items
    const selectedCaptureGroups = new Set<string>();

    captureItems.forEach((item) => {
      if (selectedCaptureItems.has(item.uniqueKey)) {
        selectedCaptureGroups.add(item.groupName);
      }
    });

    // Find tools that can work with the selected capture groups
    const compatibleTools = tools.filter((tool) =>
      tool.captureGroups.some((group) => selectedCaptureGroups.has(group))
    );

    setAvailableTools(compatibleTools);

    // Auto-select tools that were previously selected and are still available
    const availableToolIds = new Set(compatibleTools.map((tool) => tool.id));
    setSelectedTools((prev) => new Set([...prev].filter((id) => availableToolIds.has(id))));
  };

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

  const handleOpenTools = async () => {
    if (selectedCaptureItems.size === 0 || selectedTools.size === 0) return;

    try {
      // Create a single PatternMatch object containing all selected capture groups
      const selectedCaptures: Record<string, string> = {};

      captureItems
        .filter((item) => selectedCaptureItems.has(item.uniqueKey))
        .forEach((item) => {
          selectedCaptures[item.groupName] = item.value;
        });

      // Create a single PatternMatch object with all selected captures
      const combinedMatch: PatternMatch = {
        searchTermId: 'combined',
        searchTermName: 'Combined Selection',
        captures: selectedCaptures,
      };

      await window.api.quickClipsOpenTools([combinedMatch], Array.from(selectedTools));
      onClose();
    } catch (error) {
      console.error('Failed to open tools:', error);
    }
  };

  // Handle overlay click to close
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return <></>;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={classNames(styles.modal, { [styles.light]: isLight })}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={classNames(styles.title, { [styles.light]: isLight })}>
              Quick Clips Scanner
            </h2>
            <p className={classNames(styles.subtitle, { [styles.light]: isLight })}>
              Press Esc or click outside to close
            </p>
          </div>
          <button
            className={classNames(styles.closeButton, { [styles.light]: isLight })}
            onClick={onClose}
          >
            <FontAwesomeIcon icon="times" />
          </button>
        </div>

        <div
          className={classNames(styles.content, { [styles.light]: isLight })}
          style={{
            flexDirection: loading || matches.length === 0 ? 'column' : 'row',
            justifyContent: loading || matches.length === 0 ? 'center' : 'flex-start',
            alignItems: loading || matches.length === 0 ? 'center' : 'stretch',
          }}
        >
          {loading ? (
            <div className={classNames(styles.loading, { [styles.light]: isLight })}>
              <FontAwesomeIcon icon="spinner" spin />
              <span>Scanning content...</span>
            </div>
          ) : captureItems.length === 0 ? (
            <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
              <FontAwesomeIcon icon="search" className={styles.emptyIcon} />
              <p>No patterns found in this clip content.</p>
              <p className={styles.emptyHint}>
                Create search terms in Settings &gt; Quick Clips to detect patterns.
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

              {/* Right Side - Tools Section */}
              <div className={classNames(styles.section, styles.rightSection)}>
                {availableTools.length > 0 ? (
                  <>
                    <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
                      Available Tools ({availableTools.length})
                    </h3>
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
                  </>
                ) : (
                  <>
                    <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
                      Tools
                    </h3>
                    <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
                      <FontAwesomeIcon icon="wrench" className={styles.emptyIcon} />
                      <p>No compatible tools available.</p>
                      <p className={styles.emptyHint}>Select patterns to see available tools.</p>
                    </div>
                  </>
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
                onClick={onClose}
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
    </div>
  );
}
