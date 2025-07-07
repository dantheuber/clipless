import { useState, useEffect } from 'react'
import { PatternMatch } from '../../../shared/types'

/**
 * Hook to detect patterns in clip content using Quick Clips search terms
 */
export function usePatternDetection(content: string) {
  const [hasPatterns, setHasPatterns] = useState(false)
  const [patterns, setPatterns] = useState<PatternMatch[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isCancelled = false

    if (!content || content.trim().length === 0) {
      setHasPatterns(false)
      setPatterns([])
      return
    }

    const detectPatterns = async () => {
      setLoading(true)
      try {
        const matches = await window.api.quickClipsScanText(content)
        
        if (!isCancelled) {
          setPatterns(matches)
          setHasPatterns(matches.length > 0)
        }
      } catch (error) {
        console.error('Failed to scan for patterns:', error)
        if (!isCancelled) {
          setPatterns([])
          setHasPatterns(false)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    // Debounce pattern detection to avoid excessive API calls
    const timeoutId = setTimeout(detectPatterns, 300)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [content])

  return {
    hasPatterns,
    patterns,
    loading
  }
}
