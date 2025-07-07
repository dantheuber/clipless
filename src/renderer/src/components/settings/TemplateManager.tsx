import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import { Template } from '../../../../shared/types'
import { useTheme } from '../../providers/theme'
import { ConfirmDialog } from '../ConfirmDialog'
import styles from './TemplateManager.module.css'

const DEFAULT_TEMPLATE_CONTENT = `Customer Name: {c1}
Callback #: {c2}
Account ID: {c3}
Product with Issue: {c4}`

export function TemplateManager(): React.JSX.Element {
  const { isLight } = useTheme()
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; templateId: string; templateName: string }>({
    show: false,
    templateId: '',
    templateName: ''
  })

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await window.api.templatesGetAll()
      setTemplates(loadedTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const newTemplate = await window.api.templatesCreate('New Template', DEFAULT_TEMPLATE_CONTENT)
      setTemplates(prev => [...prev, newTemplate])
      setEditingId(newTemplate.id)
      setEditingName(newTemplate.name)
      setEditingContent(newTemplate.content)
      // Notify template selector about the change
      window.dispatchEvent(new CustomEvent('templatesChanged'))
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    try {
      const updatedTemplate = await window.api.templatesUpdate(editingId, {
        name: editingName,
        content: editingContent
      })

      setTemplates(prev => prev.map(t => 
        t.id === editingId ? updatedTemplate : t
      ))
      setEditingId(null)
      setEditingName('')
      setEditingContent('')
      // Notify template selector about the change
      window.dispatchEvent(new CustomEvent('templatesChanged'))
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingContent('')
  }

  const handleDeleteTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id)
    if (!template) return
    
    setDeleteConfirm({
      show: true,
      templateId: id,
      templateName: template.name
    })
  }

  const handleConfirmDelete = async () => {
    const { templateId } = deleteConfirm
    
    try {
      await window.api.templatesDelete(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      if (editingId === templateId) {
        handleCancelEdit()
      }
      // Notify template selector about the change
      window.dispatchEvent(new CustomEvent('templatesChanged'))
    } catch (error) {
      console.error('Failed to delete template:', error)
    } finally {
      setDeleteConfirm({ show: false, templateId: '', templateName: '' })
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, templateId: '', templateName: '' })
  }

  const handleStartEdit = (template: Template) => {
    setEditingId(template.id)
    setEditingName(template.name)
    setEditingContent(template.content)
    setExpandedId(template.id) // Expand when editing
  }

  const handleToggleExpand = (templateId: string) => {
    setExpandedId(expandedId === templateId ? null : templateId)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    setDraggedId(templateId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', templateId)
  }

  const handleDragOver = (e: React.DragEvent, templateId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(templateId)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault()
    
    if (!draggedId || draggedId === dropTargetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const draggedIndex = templates.findIndex(t => t.id === draggedId)
    const targetIndex = templates.findIndex(t => t.id === dropTargetId)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    // Create new array with reordered templates
    const newTemplates = [...templates]
    const [draggedTemplate] = newTemplates.splice(draggedIndex, 1)
    newTemplates.splice(targetIndex, 0, draggedTemplate)

    // Update order property
    const reorderedTemplates = newTemplates.map((template, index) => ({
      ...template,
      order: index
    }))

    setTemplates(reorderedTemplates)
    setDraggedId(null)
    setDragOverId(null)

    try {
      await window.api.templatesReorder(reorderedTemplates)
      // Notify template selector about the change
      window.dispatchEvent(new CustomEvent('templatesChanged'))
    } catch (error) {
      console.error('Failed to reorder templates:', error)
      // Revert on error
      loadTemplates()
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const extractTokens = (content: string): string[] => {
    const tokenRegex = /\{c(\d+)\}/g
    const tokens: string[] = []
    let match
    
    while ((match = tokenRegex.exec(content)) !== null) {
      if (!tokens.includes(match[0])) {
        tokens.push(match[0])
      }
    }
    
    return tokens.sort()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={classNames(styles.title, { [styles.light]: isLight })}>
          Text Templates
        </h2>
        <button
          className={classNames(styles.createButton, { [styles.light]: isLight })}
          onClick={handleCreateTemplate}
        >
          Create Template
        </button>
      </div>

      <div className={styles.description}>
        <p className={classNames(styles.descriptionText, { [styles.light]: isLight })}>
          Create reusable text templates with placeholder variables. Use tokens like {'{c1}'}, {'{c2}'}, etc. 
          to insert content from your clipboard entries.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
          <p>No templates created yet. Click "Create Template" to get started.</p>
        </div>
      ) : (
        <div className={styles.templatesList}>
          {templates.map((template) => (
            <div
              key={template.id}
              className={classNames(
                styles.templateCard,
                { [styles.light]: isLight },
                { [styles.editing]: editingId === template.id },
                { [styles.expanded]: expandedId === template.id || editingId === template.id },
                { [styles.dragging]: draggedId === template.id },
                { [styles.dragOver]: dragOverId === template.id }
              )}
              draggable={editingId !== template.id}
              onDragStart={(e) => handleDragStart(e, template.id)}
              onDragOver={(e) => handleDragOver(e, template.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, template.id)}
              onDragEnd={handleDragEnd}
            >
              {editingId === template.id ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className={classNames(styles.nameInput, { [styles.light]: isLight })}
                    placeholder="Template name"
                  />
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className={classNames(styles.contentTextarea, { [styles.light]: isLight })}
                    placeholder="Template content with {c1}, {c2}, etc."
                    rows={6}
                  />
                  <div className={styles.tokenPreview}>
                    <span className={classNames(styles.tokenLabel, { [styles.light]: isLight })}>
                      Tokens found: 
                    </span>
                    {extractTokens(editingContent).map(token => (
                      <span key={token} className={styles.token}>
                        {token}
                      </span>
                    ))}
                  </div>
                  <div className={styles.editActions}>
                    <button
                      className={classNames(styles.saveButton, { [styles.light]: isLight })}
                      onClick={handleSaveEdit}
                    >
                      Save
                    </button>
                    <button
                      className={classNames(styles.cancelButton, { [styles.light]: isLight })}
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.templateView}>
                  <div className={styles.templateHeader}>
                    <div className={styles.templateTitleSection}>
                      <div className={styles.dragHandle}>
                        <span className={styles.dragIcon}>⋮⋮</span>
                      </div>
                      <h3 
                        className={classNames(styles.templateName, { [styles.light]: isLight })}
                        onClick={() => handleToggleExpand(template.id)}
                      >
                        {template.name}
                      </h3>
                      <button
                        className={classNames(styles.expandButton, { [styles.light]: isLight })}
                        onClick={() => handleToggleExpand(template.id)}
                      >
                        {expandedId === template.id ? '▼' : '▶'}
                      </button>
                    </div>
                    <div className={styles.templateActions}>
                      <button
                        className={classNames(styles.editButton, { [styles.light]: isLight })}
                        onClick={() => handleStartEdit(template)}
                      >
                        Edit
                      </button>
                      <button
                        className={classNames(styles.deleteButton, { [styles.light]: isLight })}
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {expandedId === template.id && (
                    <div className={styles.templateDetails}>
                      <pre className={classNames(styles.templateContent, { [styles.light]: isLight })}>
                        {template.content}
                      </pre>
                      <div className={styles.tokenPreview}>
                        <span className={classNames(styles.tokenLabel, { [styles.light]: isLight })}>
                          Tokens: 
                        </span>
                        {extractTokens(template.content).map(token => (
                          <span key={token} className={styles.token}>
                            {token}
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

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${deleteConfirm.templateName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        type="danger"
      />
    </div>
  )
}
