import React, { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from '../QuickClipsManager.module.css'

interface InfoTooltipProps {
  content: React.ReactNode
}

export function InfoTooltip({ content }: InfoTooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    if (!buttonRef.current || !tooltipRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let left = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2
    let top = buttonRect.bottom + 10
    
    // Check if tooltip would go off the right edge
    if (left + tooltipRect.width > viewportWidth - 20) {
      left = viewportWidth - tooltipRect.width - 20
    }
    
    // Check if tooltip would go off the left edge
    if (left < 20) {
      left = 20
    }
    
    // Check if tooltip would go off the bottom edge
    if (top + tooltipRect.height > viewportHeight - 20) {
      top = buttonRect.top - tooltipRect.height - 10
    }
    
    // Apply positioning
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${left}px`
      tooltipRef.current.style.top = `${top}px`
    }
  }

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(true)
    // Update position after tooltip becomes visible
    setTimeout(updatePosition, 10)
  }

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 150) // Small delay to allow moving to tooltip
  }

  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleTooltipMouseLeave = () => {
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        className={styles.infoButton}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsVisible(!isVisible)
          if (!isVisible) {
            setTimeout(updatePosition, 10)
          }
        }}
        type="button"
        aria-label="More information"
      >
        <FontAwesomeIcon icon="info-circle" />
      </button>
      <div
        ref={tooltipRef}
        className={`${styles.infoTooltip} ${isVisible ? styles.visible : ''}`}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      >
        <div className={styles.infoTooltipText}>
          {content}
        </div>
      </div>
    </div>
  )
}
