import classNames from 'classnames';
import { useRef, useState } from 'react';
import { buildToolUrls } from '../../../../../shared/tools';
import { Readiness } from './Readiness';
import { TokenPicker } from './TokenPicker';
import { TokenText } from './TokenText';
import { Producers } from './UsesList';
import { trapTab } from './editorHost';
import { EditorActions } from './editorControls';
import { useCaretInsertion, useEditorLifecycle } from './editorHooks';
import { groupsNeeded } from './model';
import { resolveToolUrls, tokenise } from './resolve';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export interface ToolDraft {
  name: string;
  url: string;
}

interface ToolEditorProps {
  initial: ToolDraft;
  onSave: (draft: ToolDraft) => void | Promise<void>;
  onCancel: () => void;
}

const PREVIEW_LIMIT = 4;

export function ToolEditor({ initial, onSave, onCancel }: ToolEditorProps) {
  const { config, values, scan } = useToolsData();
  const [name, setName] = useState(initial.name);
  const [url, setUrl] = useState(initial.url);
  const [saving, setSaving] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  const canSave = name.trim().length > 0 && url.trim().length > 0 && !saving;
  const dirty = name !== initial.name || url !== initial.url;
  const count = buildToolUrls({ url }, values).length;
  const resolved = resolveToolUrls(url, values);
  const needed = groupsNeeded({ url });

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), url: url.trim() });
    } finally {
      setSaving(false);
    }
  };

  useEditorLifecycle({ dirty, canSave, save, focusRef: urlRef });
  const insert = useCaretInsertion(urlRef, url, setUrl);

  return (
    <div className={styles.editor} onKeyDown={trapTab} data-testid="tool-editor">
      <label className={w.field} htmlFor="tool-name">
        Name
      </label>
      <input
        id="tool-name"
        type="text"
        className={w.input}
        style={{ width: '100%' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid="tool-name"
      />
      <label className={w.field} htmlFor="tool-url">
        URL template
      </label>
      <input
        id="tool-url"
        ref={urlRef}
        type="text"
        className={classNames(w.input, w.mono)}
        style={{ width: '100%' }}
        spellCheck={false}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        data-testid="tool-url"
      />
      <TokenPicker onInsert={insert} />
      <div className={styles.meta}>
        <Readiness item={{ url }} terms={config.terms} scan={scan} />
      </div>
      <div className={styles.preview}>
        <div className={styles.previewCap} data-testid="tool-preview-caption">
          {count > 0
            ? `Would open ${count} ${count === 1 ? 'tab' : 'tabs'} from the sample`
            : 'Preview'}
        </div>
        {resolved.length > 0 ? (
          <>
            {resolved.slice(0, PREVIEW_LIMIT).map((segments, i) => (
              <TokenText key={i} segments={segments} terms={config.terms} className={styles.url} />
            ))}
            {resolved.length > PREVIEW_LIMIT && (
              <span className={styles.none}>and {resolved.length - PREVIEW_LIMIT} more</span>
            )}
          </>
        ) : (
          <>
            <TokenText segments={tokenise(url)} terms={config.terms} className={styles.url} />
            <span className={styles.none}>nothing would open from the sample</span>
          </>
        )}
      </div>
      {needed.length > 0 && (
        <div className={classNames(styles.meta, styles.uses)}>
          fed by <Producers config={config} groups={needed} />
        </div>
      )}
      <EditorActions prefix="tool" canSave={canSave} onSave={save} onCancel={onCancel} />
    </div>
  );
}
