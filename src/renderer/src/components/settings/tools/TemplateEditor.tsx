import classNames from 'classnames';
import { useRef, useState } from 'react';
import { Readiness } from './Readiness';
import { TokenPicker } from './TokenPicker';
import { TokenText } from './TokenText';
import { trapTab } from './editorHost';
import { EditorActions } from './editorControls';
import { useCaretInsertion, useEditorLifecycle } from './editorHooks';
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

export function TemplateEditor({ initial, onSave, onCancel }: TemplateEditorProps) {
  const { config, values, scan } = useToolsData();
  const [name, setName] = useState(initial.name);
  const [content, setContent] = useState(initial.content);
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

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

  useEditorLifecycle({ dirty, canSave, save, focusRef: textRef });
  const insert = useCaretInsertion(textRef, content, setContent);

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
      <EditorActions prefix="template" canSave={canSave} onSave={save} onCancel={onCancel} />
    </div>
  );
}
