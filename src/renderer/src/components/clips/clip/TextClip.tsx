import { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import { useLanguageDetection } from '../../../providers/languageDetection';
import { mapToSyntaxHighlighterLanguage } from '../../../utils/languageDetection';
import styles from './Clip.module.css';

const SyntaxHighlightedCode = lazy(() => import('./SyntaxHighlightedCode'));

interface TextClipProps {
  clip: ClipItem;
  onUpdate: (newContent: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export const TextClip = ({ clip, onUpdate, onEditingChange }: TextClipProps) => {
  const { isLight } = useTheme();
  const { isCodeDetectionEnabled } = useLanguageDetection();

  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea (only for multiline content)
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;

      if (!editValue.includes('\n')) {
        // Single line: reset to natural height to avoid extra spacing
        textarea.style.height = '';
        const container = textarea.closest(`.${styles.syntaxHighlightContainer}`);
        if (container) {
          (container as HTMLElement).style.height = '';
        }
        return;
      }

      textarea.style.height = 'auto';
      const newHeight = `${textarea.scrollHeight}px`;
      textarea.style.height = newHeight;

      // Also update the syntax highlighter container if it exists
      const container = textarea.closest(`.${styles.syntaxHighlightContainer}`);
      if (container) {
        (container as HTMLElement).style.height = newHeight;
      }
    }
  }, [isEditing, editValue]);

  // Debounced update function
  const debouncedUpdate = useCallback(
    (newContent: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        /* istanbul ignore else -- @preserve */
        if (newContent !== clip.content) {
          onUpdate(newContent);
        }
      }, 500); // 500ms debounce
    },
    [clip.content, onUpdate]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleTextClick = () => {
    if (clip.content.trim() !== '') {
      setIsEditing(true);
      setEditValue(clip.content);
      onEditingChange?.(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    debouncedUpdate(newValue);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    onEditingChange?.(false);
    // Force immediate update on blur if there are pending changes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      if (editValue !== clip.content) {
        onUpdate(editValue);
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
      onEditingChange?.(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    }
  };

  if (isEditing) {
    // Check if syntax highlighting should be applied
    const shouldHighlight = isCodeDetectionEnabled && clip.isCode && clip.language;

    if (shouldHighlight) {
      const syntaxLanguage = mapToSyntaxHighlighterLanguage(clip.language!);

      const fallback = (
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
            spellCheck={false}
            style={{ resize: 'none', minHeight: '1.2em' }}
          />
        </div>
      );

      return (
        <Suspense fallback={fallback}>
          <SyntaxHighlightedCode
            ref={textareaRef}
            editValue={editValue}
            syntaxLanguage={syntaxLanguage}
            isLight={isLight}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
          />
        </Suspense>
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
            spellCheck={false}
            style={{
              resize: 'none',
              minHeight: '1.2em',
            }}
          />
        </div>
      );
    }
  } else {
    // Display mode - single line with no language indicators
    // Convert multiline text to single line for display
    const displayContent =
      clip.content.trim() === ''
        ? '(empty)'
        : clip.content.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

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
};
