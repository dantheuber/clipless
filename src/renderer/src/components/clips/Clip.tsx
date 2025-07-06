import { useRef, useState, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipItem, useClips } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import { useLanguageDetection } from '../../providers/languageDetection';
import { mapToSyntaxHighlighterLanguage } from '../../utils/languageDetection';
import styles from './Clip.module.css';
import { ClipOptions } from './ClipOptions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ClipProps {
  clip: ClipItem;
  index: number;
}

export const Clip = ({ clip, index }: ClipProps): React.JSX.Element => {
  const { copyClipToClipboard, clipCopyIndex, updateClip } = useClips();
  const { isLight } = useTheme();
  const { isCodeDetectionEnabled } = useLanguageDetection();
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editValue]);

  // Debounced update function
  const debouncedUpdate = useCallback((newContent: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (newContent !== clip.content) {
        updateClip(index, { ...clip, content: newContent });
      }
    }, 500); // 500ms debounce
  }, [clip, index, updateClip]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleTextClick = () => {
    if (clip.type === 'text' && clip.content.trim() !== '') {
      setIsEditing(true);
      setEditValue(clip.content);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    debouncedUpdate(newValue);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    // Force immediate update on blur if there are pending changes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      if (editValue !== clip.content) {
        updateClip(index, { ...clip, content: editValue });
      }
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setEditValue(clip.content); // Reset to original value
      setIsEditing(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    }
  };

  const handleRowNumberClick = async () => {
    await copyClipToClipboard(index);
  };

  const handleImageMouseEnter = (e: React.MouseEvent<HTMLImageElement>) => {
    const popover = popoverRef.current;
    if (popover) {
      const rect = e.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popoverHeight = 320; // 20rem max-height
      const popoverWidth = 320; // 20rem max-width
      
      // Calculate preferred position (to the right of the image)
      let left = rect.right + 16;
      let top = rect.top + rect.height / 2 - popoverHeight / 2; // Center the popover vertically on the image
      
      // Check if popover would extend beyond right edge of viewport
      if (left + popoverWidth > viewportWidth) {
        // Position to the left of the image instead
        left = rect.left - popoverWidth - 16;
      }
      
      // Ensure popover doesn't go beyond left edge
      if (left < 16) {
        left = 16;
      }
      
      // Check if popover would extend beyond bottom of viewport
      if (top + popoverHeight > viewportHeight) {
        // Position at bottom edge of viewport with padding
        top = viewportHeight - popoverHeight - 16;
      }
      
      // Check if popover would extend beyond top of viewport
      if (top < 16) {
        top = 16;
      }
      
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      popover.style.transform = 'none'; // Always use none since we calculate exact position
    }
  };

  const renderClipContent = () => {
    switch (clip.type) {
      case 'text':
        if (isEditing) {
          // Check if syntax highlighting should be applied
          const shouldHighlight = isCodeDetectionEnabled && clip.isCode && clip.language;
          
          if (shouldHighlight) {
            const syntaxLanguage = mapToSyntaxHighlighterLanguage(clip.language!);
            const syntaxStyle = isLight ? materialLight : materialDark;
            const borderColor = isLight ? '#d0d0d0' : '#404040';
            const backgroundColor = isLight ? '#f8f8f8' : '#404040';
            
            return (
              <div className={styles.textEditorWrapper}>
                <div className={styles.syntaxHighlightContainer}>
                  <SyntaxHighlighter
                    language={syntaxLanguage}
                    style={syntaxStyle}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      background: backgroundColor,
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      lineHeight: 'inherit',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '0.25rem',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        background: 'transparent !important',
                        padding: 0,
                        margin: 0,
                      }
                    }}
                    preTag="pre"
                    PreTag={({ children, ...props }) => (
                      <pre {...props} style={{ ...props.style, margin: 0, padding: '0.125rem 0.25rem' }}>
                        {children}
                      </pre>
                    )}
                  >
                    {editValue}
                  </SyntaxHighlighter>
                  <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={handleTextChange}
                    onBlur={handleTextBlur}
                    onKeyDown={handleTextKeyDown}
                    className={classNames(styles.textEditor, styles.syntaxOverlay, { [styles.light]: isLight })}
                    autoFocus
                    rows={1}
                    style={{ 
                      resize: 'none',
                      minHeight: '1.2em',
                      overflow: 'hidden',
                      color: 'transparent',
                      caretColor: isLight ? '#000' : '#fff',
                      lineHeight: 'inherit',
                    }}
                  />
                </div>
              </div>
            );
          } else {
            // Regular textarea without syntax highlighting
            return (
              <div className={styles.textEditorWrapper}>
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={handleTextChange}
                  onBlur={handleTextBlur}
                  onKeyDown={handleTextKeyDown}
                  className={classNames(styles.textEditor, { [styles.light]: isLight })}
                  autoFocus
                  rows={1}
                  style={{ 
                    resize: 'none',
                    minHeight: '1.2em',
                    overflow: 'hidden'
                  }}
                />
              </div>
            );
          }
        } else {
          // Display mode - single line with no language indicators
          // Convert multiline text to single line for display
          const displayContent = clip.content.trim() === '' ? '(empty)' : 
            clip.content.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
          
          return (
            <span 
              onClick={handleTextClick}
              className={classNames(
                styles.editableText, 
                { [styles.light]: isLight },
                { [styles.emptyText]: clip.content.trim() === '' }
              )}
              title={clip.content.trim() === '' ? 'Empty clip' : 'Click to edit'}
            >
              {displayContent}
            </span>
          );
        }
      case 'html':
        return (
          <div>
            <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>HTML:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'image':
        return (
          <div className={styles.imagePreviewContainer}>
            <img 
              src={clip.content}
              alt="Clipboard image preview"
              className={classNames(styles.imagePreview, { [styles.light]: isLight })}
              onMouseEnter={handleImageMouseEnter}
              onError={(e) => {
                // Fallback to text if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('span');
                fallback.textContent = 'Invalid image data';
                fallback.style.color = isLight ? '#666666' : 'rgb(156 163 175)';
                fallback.style.fontSize = '0.75rem';
                target.parentNode?.appendChild(fallback);
              }}
            />
            <div ref={popoverRef} className={classNames(styles.imagePopover, { [styles.light]: isLight })}>
              <img 
                src={clip.content} 
                alt="Large image preview"
                className={classNames(styles.popoverImage, { [styles.light]: isLight })}
              />
            </div>
            <div className={styles.imageInfo}>
              <span className={classNames(styles.imageFilename, { [styles.light]: isLight })}>
                Image ({clip.content.startsWith('data:image/') ? 
                  clip.content.split(';')[0].split('/')[1].toUpperCase() : 
                  'Unknown format'})
              </span>
              <span className={classNames(styles.imageSize, { [styles.light]: isLight })}>
                {Math.round(clip.content.length * 0.75 / 1024)} KB
              </span>
            </div>
          </div>
        );
      case 'rtf':
        return (
          <div>
            <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>RTF:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'bookmark':
        return (
          <div>
            <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>Bookmark:</span>
            <span>{clip.title || 'Untitled'} - {clip.url}</span>
          </div>
        );
      default:
        return <span>{clip.content}</span>;
    }
  };

  const isCurrentCopiedClip = clipCopyIndex === index;

  return (
    <li className={styles.clip}>
      <div className={classNames(
        styles.clipRow, 
        { [styles.light]: isLight },
        { [styles.expanded]: isEditing }
      )}>
        {/* Row number */}
        <div 
          className={classNames(
            styles.rowNumber,
            { [styles.light]: isLight },
            {
              [styles.currentCopiedClip]: isCurrentCopiedClip,
            }
          )}
          onClick={handleRowNumberClick}
          title="Click to copy this clip to clipboard"
        >
          {isCurrentCopiedClip ? <FontAwesomeIcon icon="clipboard-check" /> : index + 1}
        </div>
        
        {/* Content area */}
        <div className={classNames(styles.contentArea, { [styles.light]: isLight })}>
          {renderClipContent()}
        </div>
        
        <ClipOptions index={index} />
      </div>
    </li>
  );
};
