import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { Readiness } from './Readiness';
import { TokenPicker, insertAtCaret } from './TokenPicker';
import { TokenText } from './TokenText';
import { trapTab, useEditorHost } from './editorHost';
import { isClipTemplate } from './model';
import { resolveTemplate } from './resolve';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export interface TemplateDraft {
  name: string;
  content: string;
}

interface TemplateEditorProps {
  initial: TemplateDraft;
  onSave: (draft: TemplateDraft) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * The template editor (spec 14.3): name, text, token picker, readiness line, generated
 * text with values coloured by group. A positional-only template says "clip template"
 * instead of a readiness line.
 */
export function TemplateEditor({ initial, onSave, onCancel }: TemplateEditorProps) {
  const { config, values, scan } = useToolsData();
  const host = useEditorHost();
  const [name, setName] = useState(initial.name);
  const [content, setContent] = useState(initial.content);
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState<number | null>(null);

  const canSave = name.trim().length > 0 && content.trim().length > 0 && !saving;
  const dirty = name !== initial.name || content !== initial.content;
  const clip = isClipTemplate({ content });

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), content });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    host.setDirty(dirty);
  }, [dirty, host]);
  useEffect(() => {
    host.setSaver(canSave ? save : null);
    return () => host.setSaver(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, name, content]);
  useEffect(() => {
    textRef.current?.focus();
  }, []);
  useEffect(() => {
    if (caret !== null && textRef.current) {
      textRef.current.focus();
      textRef.current.setSelectionRange(caret, caret);
      setCaret(null);
    }
  }, [caret, content]);

  const insert = (token: string) => {
    const next = insertAtCaret(textRef.current, content, token);
    setContent(next.value);
    setCaret(next.caret);
  };

  return (
    <div className={styles.editor} onKeyDown={trapTab} data-testid="template-editor">
      <label className={w.field} htmlFor="template-name">
        Name
      </label>
      <input
        id="template-name"
        type="text"
        className={w.input}
        style={{ width: '100%' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid="template-name"
      />
      <label className={w.field} htmlFor="template-text">
        Text
      </label>
      <textarea
        id="template-text"
        ref={textRef}
        className={classNames(w.textarea, w.mono)}
        style={{ minHeight: 72 }}
        spellCheck={false}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        data-testid="template-text"
      />
      <TokenPicker onInsert={insert} />
      <div className={styles.meta}>
        {clip ? (
          <span className={styles.ready} data-testid="readiness" data-level="clip">
            <b>clip template</b> positional tokens only; filled from the context menu, never from
            pins, so it does not appear in the tray
          </span>
        ) : (
          <Readiness item={{ content }} terms={config.terms} scan={scan} />
        )}
      </div>
      <div className={styles.preview}>
        <div className={styles.previewCap}>Generated from the sample</div>
        {content.length > 0 ? (
          <TokenText
            segments={resolveTemplate(content, values)}
            terms={config.terms}
            className={styles.text}
          />
        ) : (
          <span className={styles.none}>empty</span>
        )}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={classNames(w.btn, w.primary)}
          disabled={!canSave}
          onClick={save}
          data-testid="template-save"
        >
          Save
        </button>
        <button
          type="button"
          className={classNames(w.btn, w.ghost)}
          onClick={onCancel}
          data-testid="template-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
