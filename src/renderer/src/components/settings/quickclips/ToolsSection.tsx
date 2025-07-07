import React from 'react'
import classNames from 'classnames'
import { QuickTool } from '../../../../../shared/types'
import { useTheme } from '../../../providers/theme'
import { InfoTooltip } from './InfoTooltip'
import styles from '../QuickClipsManager.module.css'

interface ToolsSectionProps {
  tools: QuickTool[]
  editingToolId: string | null
  editingToolName: string
  editingToolUrl: string
  editingToolCaptureGroups: string[]
  expandedToolId: string | null
  availableCaptureGroups: string[]
  onCreateTool: () => Promise<void>
  onSaveTool: () => Promise<void>
  onCancelToolEdit: () => void
  onStartToolEdit: (tool: QuickTool) => void
  onDeleteTool: (id: string) => void
  onEditingToolNameChange: (name: string) => void
  onEditingToolUrlChange: (url: string) => void
  onToggleCaptureGroup: (groupName: string) => void
  onExpandedToolIdChange: (id: string | null) => void
}

export function ToolsSection({
  tools,
  editingToolId,
  editingToolName,
  editingToolUrl,
  editingToolCaptureGroups,
  expandedToolId,
  availableCaptureGroups,
  onCreateTool,
  onSaveTool,
  onCancelToolEdit,
  onStartToolEdit,
  onDeleteTool,
  onEditingToolNameChange,
  onEditingToolUrlChange,
  onToggleCaptureGroup,
  onExpandedToolIdChange
}: ToolsSectionProps): React.JSX.Element {
  const { isLight } = useTheme()

  return (
    <div className={styles.tabContent}>
      <div className={styles.headerWithInfo}>
        <button
          className={classNames(styles.createButton, { [styles.light]: isLight })}
          onClick={onCreateTool}
        >
          Create Tool
        </button>
        <InfoTooltip
          content={
            <>
              Tools are web URLs that can be opened with extracted data from search terms. 
              Use tokens like <code>{'{'}email{'}'}</code> or <code>{'{'}domainName{'}'}</code> in the URL 
              to insert captured values.
            </>
          }
        />
      </div>

      {tools.length === 0 ? (
        <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
          <p>No tools created yet. Click "Create Tool" to get started.</p>
        </div>
      ) : (
        <div className={styles.itemsList}>
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={classNames(
                styles.itemCard,
                { [styles.light]: isLight },
                { [styles.editing]: editingToolId === tool.id },
                { [styles.expanded]: expandedToolId === tool.id || editingToolId === tool.id }
              )}
            >
              {editingToolId === tool.id ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    value={editingToolName}
                    onChange={(e) => onEditingToolNameChange(e.target.value)}
                    className={classNames(styles.nameInput, { [styles.light]: isLight })}
                    placeholder="Tool name"
                  />
                  <input
                    type="url"
                    value={editingToolUrl}
                    onChange={(e) => onEditingToolUrlChange(e.target.value)}
                    className={classNames(styles.urlInput, { [styles.light]: isLight })}
                    placeholder="URL with {captureGroupName} tokens"
                  />
                  <div className={styles.captureGroupsSelection}>
                    <span className={classNames(styles.label, { [styles.light]: isLight })}>
                      Supported Capture Groups:
                    </span>
                    <div className={styles.captureGroupsList}>
                      {availableCaptureGroups.map(group => (
                        <label 
                          key={group} 
                          className={classNames(styles.captureGroupOption, { [styles.light]: isLight })}
                        >
                          <input
                            type="checkbox"
                            checked={editingToolCaptureGroups.includes(group)}
                            onChange={() => onToggleCaptureGroup(group)}
                          />
                          {group}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className={styles.editActions}>
                    <button
                      className={classNames(styles.saveButton, { [styles.light]: isLight })}
                      onClick={onSaveTool}
                    >
                      Save
                    </button>
                    <button
                      className={classNames(styles.cancelButton, { [styles.light]: isLight })}
                      onClick={onCancelToolEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.itemView}>
                  <div className={styles.itemHeader}>
                    <h4 
                      className={classNames(styles.itemName, { [styles.light]: isLight })}
                      onClick={() => onExpandedToolIdChange(expandedToolId === tool.id ? null : tool.id)}
                    >
                      {tool.name}
                    </h4>
                    <div className={styles.itemActions}>
                      <button
                        className={classNames(styles.editButton, { [styles.light]: isLight })}
                        onClick={() => onStartToolEdit(tool)}
                      >
                        Edit
                      </button>
                      <button
                        className={classNames(styles.deleteButton, { [styles.light]: isLight })}
                        onClick={() => onDeleteTool(tool.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {expandedToolId === tool.id && (
                    <div className={styles.itemDetails}>
                      <div className={styles.urlDisplay}>
                        <span className={classNames(styles.label, { [styles.light]: isLight })}>URL:</span>
                        <code className={classNames(styles.code, { [styles.light]: isLight })}>
                          {tool.url}
                        </code>
                      </div>
                      <div className={styles.captureGroupsPreview}>
                        <span className={classNames(styles.label, { [styles.light]: isLight })}>
                          Supported Groups: 
                        </span>
                        {tool.captureGroups.map(group => (
                          <span key={group} className={styles.captureGroup}>
                            {group}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
