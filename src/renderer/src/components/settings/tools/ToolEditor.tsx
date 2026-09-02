import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { buildToolUrls, hasWebScheme } from '../../../../../shared/tools';
import { Readiness } from './Readiness';
import { TokenPicker, insertAtCaret } from './TokenPicker';
import { TokenText } from './TokenText';
import { Producers } from './UsesList';
import { trapTab, useEditorHost } from './editorHost';
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
const WEB_PREFIX = 'https://';
/**
 * A leading scheme to drop before prefixing https://. The digit lookahead keeps a
 * schemeless host:port ("localhost:3000/{ip}") intact, since no scheme is followed by a digit.
 */
const LEADING_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)\/*/i;

/**
 * The tool editor (spec 14.3): name, URL, token picker, readiness line, a preview titled
 * "Would open N tabs from the sample" listing every resolved URL with values coloured by
 * group, and the "fed by" list. The count comes from buildToolUrls, as the tray's does.
 */
export function ToolEditor({ initial, onSave, onCancel }: ToolEditorProps) {
  const { config, values, scan } = useToolsData();
  const host = useEditorHost();
  const [name, setName] = useState(initial.name);
  const [url, setUrl] = useState(initial.url);
  const [saving, setSaving] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState<number | null>(null);

  const canSave = name.trim().length > 0 && url.trim().length > 0 && !saving;
  const dirty = name !== initial.name || url !== initial.url;
  const count = buildToolUrls({ url }, values).length;
  const resolved = resolveToolUrls(url, values);
  const needed = groupsNeeded({ url });
  const schemeless = url.trim().length > 0 && !hasWebScheme(url);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), url: url.trim() });
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
  }, [canSave, name, url]);
  useEffect(() => {
    urlRef.current?.focus();
  }, []);
  useEffect(() => {
    if (caret !== null && urlRef.current) {
      urlRef.current.focus();
      urlRef.current.setSelectionRange(caret, caret);
      setCaret(null);
    }
  }, [caret, url]);

  const insert = (token: string) => {
    const next = insertAtCaret(urlRef.current, url, token);
    setUrl(next.value);
    setCaret(next.caret);
  };

  const addScheme = () => {
    setUrl(WEB_PREFIX + url.trimStart().replace(LEADING_SCHEME, ''));
    setCaret(WEB_PREFIX.length);
  };

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
      {schemeless && (
        <div className={styles.meta}>
          <span className={classNames(w.msg, w.msgWarn)} data-testid="tool-url-scheme">
            only http and https links can open; this template starts with neither
          </span>
          <button
            type="button"
            className={w.link}
            onClick={addScheme}
            data-testid="tool-url-scheme-fix"
          >
            add https://
          </button>
        </div>
      )}
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
      <div className={styles.actions}>
        <button
          type="button"
          className={classNames(w.btn, w.primary)}
          disabled={!canSave}
          onClick={save}
          data-testid="tool-save"
        >
          Save
        </button>
        <button
          type="button"
          className={classNames(w.btn, w.ghost)}
          onClick={onCancel}
          data-testid="tool-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
