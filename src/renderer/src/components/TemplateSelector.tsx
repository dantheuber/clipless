import React, { useState, useEffect, useRef } from 'react'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Template } from '../../../shared/types'
import { useTheme } from '../providers/theme'
import { useClips } from '../providers/clips'
import styles from './TemplateSelector.module.css'

interface TemplateSelectorProps {
  className?: string
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ className }) => {
  const { isLight } = useTheme()
  const { clips } = useClips()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    
    return undefined
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await window.api.templatesGetAll()
      setTemplates(loadedTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleTemplateSelect = async (template: Template) => {
    setIsGenerating(true)
    setIsOpen(false)
    
    try {
      // Get clipboard contents as string array
      const clipContents = clips.map(clip => clip.content || '')
      
      // Generate text from template
      const generatedText = await window.api.templatesGenerateText(template.id, clipContents)
      
      // Set to clipboard
      await window.api.setClipboardText(generatedText)
      
      console.log(`Generated text from template "${template.name}" and copied to clipboard`)
    } catch (error) {
      console.error('Failed to generate text from template:', error)
    } finally {
      setIsGenerating(false)
    }
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

  const getPreviewText = (template: Template): string => {
    const tokens = extractTokens(template.content)
    if (tokens.length === 0) return template.content
    
    const maxLength = 100
    let preview = template.content
    
    // Replace tokens with clip previews or placeholders
    tokens.forEach(token => {
      const match = token.match(/\{c(\d+)\}/)
      if (match) {
        const clipIndex = parseInt(match[1]) - 1
        const clipContent = clips[clipIndex]?.content || `[No clip ${match[1]}]`
        const shortContent = clipContent.length > 20 ? clipContent.substring(0, 20) + '...' : clipContent
        preview = preview.replace(token, shortContent)
      }
    })
    
    return preview.length > maxLength ? preview.substring(0, maxLength) + '...' : preview
  }

  if (templates.length === 0) {
    return null // Don't show button if no templates
  }

  return (
    <div className={classNames(styles.container, className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(styles.triggerButton, { [styles.light]: isLight })}
        disabled={isGenerating}
        title="Select Template"
      >
        <FontAwesomeIcon 
          icon={isGenerating ? "spinner" : "file-text"} 
          className={classNames(styles.icon, { [styles.spinning]: isGenerating })} 
        />
        <span>Templates</span>
        <FontAwesomeIcon 
          icon="chevron-up" 
          className={classNames(styles.chevron, { [styles.open]: isOpen })} 
        />
      </button>

      {isOpen && (
        <div className={classNames(styles.dropdown, { [styles.light]: isLight })}>
          <div className={styles.dropdownHeader}>
            <span className={styles.headerText}>Select Template</span>
          </div>
          
          <div className={styles.templateList}>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={classNames(styles.templateItem, { [styles.light]: isLight })}
              >
                <div className={styles.templateInfo}>
                  <span className={styles.templateName}>{template.name}</span>
                  <span className={styles.templatePreview}>
                    {getPreviewText(template)}
                  </span>
                  <div className={styles.templateTokens}>
                    {extractTokens(template.content).map(token => (
                      <span key={token} className={styles.token}>
                        {token}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
