import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import { PatternMatch, QuickTool } from '../../../../shared/types'
import { useTheme } from '../../providers/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './QuickClipsScanner.module.css'

interface QuickClipsScannerProps {
  isOpen: boolean
  onClose: () => void
  clipContent: string
}

export function QuickClipsScanner({ isOpen, onClose, clipContent }: QuickClipsScannerProps): React.JSX.Element {
  const { isLight } = useTheme()
  const [matches, setMatches] = useState<PatternMatch[]>([])
  const [tools, setTools] = useState<QuickTool[]>([])
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set())
  const [availableTools, setAvailableTools] = useState<QuickTool[]>([])
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    
    // Return empty cleanup function for when not open
    return () => {}
  }, [isOpen, onClose])

  // Scan the clip content when modal opens
  useEffect(() => {
    if (isOpen && clipContent) {
      scanContent()
    }
  }, [isOpen, clipContent])

  // Load available tools
  useEffect(() => {
    if (isOpen) {
      loadTools()
    }
  }, [isOpen])

  // Update available tools when matches or selected matches change
  useEffect(() => {
    if (matches.length > 0 && tools.length > 0) {
      updateAvailableTools()
    }
  }, [matches, tools, selectedMatches])

  const scanContent = async () => {
    setLoading(true)
    try {
      const scanResults = await window.api.quickClipsScanText(clipContent)
      setMatches(scanResults)
      // Auto-select all matches initially
      const matchKeys = scanResults.map((match, index) => 
        `${match.searchTermId}-${index}-${Object.keys(match.captures).join('-')}`
      )
      setSelectedMatches(new Set(matchKeys))
    } catch (error) {
      console.error('Failed to scan content:', error)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  const loadTools = async () => {
    try {
      const loadedTools = await window.api.quickToolsGetAll()
      setTools(loadedTools)
    } catch (error) {
      console.error('Failed to load tools:', error)
      setTools([])
    }
  }

  const updateAvailableTools = () => {
    // Get all capture groups from selected matches
    const selectedCaptureGroups = new Set<string>()
    
    matches.forEach((match, index) => {
      const matchKey = `${match.searchTermId}-${index}-${Object.keys(match.captures).join('-')}`
      if (selectedMatches.has(matchKey)) {
        Object.keys(match.captures).forEach(group => selectedCaptureGroups.add(group))
      }
    })

    // Find tools that can work with the selected capture groups
    const compatibleTools = tools.filter(tool => 
      tool.captureGroups.some(group => selectedCaptureGroups.has(group))
    )

    setAvailableTools(compatibleTools)
    
    // Auto-select tools that were previously selected and are still available
    const availableToolIds = new Set(compatibleTools.map(tool => tool.id))
    setSelectedTools(prev => new Set([...prev].filter(id => availableToolIds.has(id))))
  }

  const handleMatchToggle = (matchKey: string) => {
    const newSelected = new Set(selectedMatches)
    if (newSelected.has(matchKey)) {
      newSelected.delete(matchKey)
    } else {
      newSelected.add(matchKey)
    }
    setSelectedMatches(newSelected)
  }

  const handleToolToggle = (toolId: string) => {
    const newSelected = new Set(selectedTools)
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId)
    } else {
      newSelected.add(toolId)
    }
    setSelectedTools(newSelected)
  }

  const handleOpenTools = async () => {
    if (selectedMatches.size === 0 || selectedTools.size === 0) return

    try {
      // Get the actual match objects for selected matches
      const selectedMatchObjects = matches.filter((match, index) => {
        const matchKey = `${match.searchTermId}-${index}-${Object.keys(match.captures).join('-')}`
        return selectedMatches.has(matchKey)
      })

      await window.api.quickClipsOpenTools(selectedMatchObjects, Array.from(selectedTools))
      onClose()
    } catch (error) {
      console.error('Failed to open tools:', error)
    }
  }

  const getMatchKey = (match: PatternMatch, index: number): string => {
    return `${match.searchTermId}-${index}-${Object.keys(match.captures).join('-')}`
  }

  // Handle overlay click to close
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return <></>

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

        <div className={classNames(styles.content, { [styles.light]: isLight })} style={{ 
          flexDirection: loading || matches.length === 0 ? 'column' : 'row',
          justifyContent: loading || matches.length === 0 ? 'center' : 'flex-start',
          alignItems: loading || matches.length === 0 ? 'center' : 'stretch'
        }}>
          {loading ? (
            <div className={classNames(styles.loading, { [styles.light]: isLight })}>
              <FontAwesomeIcon icon="spinner" spin />
              <span>Scanning content...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
              <FontAwesomeIcon icon="search" className={styles.emptyIcon} />
              <p>No patterns found in this clip content.</p>
              <p className={styles.emptyHint}>
                Create search terms in Settings &gt; Quick Clips to detect patterns.
              </p>
            </div>
          ) : (
            <>
              {/* Left Side - Matches Section */}
              <div className={classNames(styles.section, styles.leftSection)}>
                <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
                  Found Patterns ({matches.length})
                </h3>
                <div className={styles.matchesList}>
                  {matches.map((match, index) => {
                    const matchKey = getMatchKey(match, index)
                    const isSelected = selectedMatches.has(matchKey)
                    
                    return (
                      <div
                        key={matchKey}
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
                            onChange={() => handleMatchToggle(matchKey)}
                            className={styles.checkbox}
                          />
                          <div className={styles.matchDetails}>
                            <div className={styles.matchCaptures}>
                              {Object.entries(match.captures).map(([group, value]) => (
                                <div key={group} className={styles.capture}>
                                  <span className={classNames(styles.captureGroup, { [styles.light]: isLight })}>{group}:</span>
                                  <span className={classNames(styles.captureValue, { [styles.light]: isLight })}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </label>
                      </div>
                    )
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
                      {availableTools.map(tool => {
                        const isSelected = selectedTools.has(tool.id)
                        
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
                                <div className={classNames(styles.toolName, { [styles.light]: isLight })}>{tool.name}</div>
                                <div className={classNames(styles.toolUrl, { [styles.light]: isLight })}>{tool.url}</div>
                                <div className={classNames(styles.toolGroups, { [styles.light]: isLight })}>
                                  Supports: {tool.captureGroups.join(', ')}
                                </div>
                              </div>
                            </label>
                          </div>
                        )
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
                      <p className={styles.emptyHint}>
                        Select patterns to see available tools.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {matches.length > 0 && (
          <div className={classNames(styles.footer, { [styles.light]: isLight })}>
            <div className={styles.stats}>
              <span className={classNames(styles.statText, { [styles.light]: isLight })}>
                {selectedMatches.size} patterns, {selectedTools.size} tools selected
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
                disabled={selectedMatches.size === 0 || selectedTools.size === 0}
              >
                Open Tools
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
