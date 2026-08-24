import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import { tokenizeLine } from '../../quick-look/tokens';
import styles from './Editor.module.css';

interface EditorProps {
  value: string;

  language: string | null;
  onChange: (value: string) => void;

  onCommit: () => void;

  onCancel: () => void;

  size: 'row' | 'reader';
}

export function Editor({ value, language, onChange, onCommit, onCancel, size }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || size !== 'row') return;
    if (!value.includes('\n')) {
      textarea.style.height = '';
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value, size]);

  const lines = useMemo(
    () => (language ? value.split('\n').map((line) => tokenizeLine(line, language)) : null),
    [value, language]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };

  const syncScroll = () => {
    const overlay = overlayRef.current;
    const textarea = textareaRef.current;
    if (overlay && textarea) {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    }
  };

  return (
    <div className={classNames(styles.editor, styles[size], { [styles.highlighted]: !!lines })}>
      {lines && (
        <pre ref={overlayRef} className={styles.overlay} aria-hidden="true">
          {lines.map((runs, i) => (
            <div key={i} className={styles.line}>
              {runs.length === 0
                ? '​'
                : runs.map((run, j) => (
                    <span
                      key={j}
                      className={run.classes.map((cls) => `tok-${cls}`).join(' ') || undefined}
                    >
                      {run.text}
                    </span>
                  ))}
            </div>
          ))}
        </pre>
      )}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        autoFocus
        rows={1}
        spellCheck={false}
        data-testid="clip-editor"
      />
    </div>
  );
}
