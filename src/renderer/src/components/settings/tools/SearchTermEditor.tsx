import classNames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';
import { scanText } from '../../../../../shared/scan';
import { patternGroups } from '../../../../../shared/readiness';
import { ToggleSwitch } from '../usersettings/ToggleSwitch';
import { GroupPill } from './GroupPill';
import { ChipsPreview } from './ValueChip';
import { Consumers } from './UsesList';
import { trapTab, useEditorHost } from './editorHost';
import { groupState, validatePattern } from './model';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export interface TermDraft {
  name: string;
  pattern: string;
  enabled: boolean;
}

interface SearchTermEditorProps {
  initial: TermDraft;
  /** The id of the term under edit, so its own scan errors are not confused with others */
  id?: string;
  onSave: (draft: TermDraft) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * The search term editor (spec 14.3): name, enabled toggle, pattern, validation, the
 * "produces" pills, the pattern under edit run against the sample and shown as chips, and
 * the "feeds" list. Save is disabled while invalid; nothing is stored until Save.
 */
export function SearchTermEditor({
  initial,
  id = 'draft',
  onSave,
  onCancel,
}: SearchTermEditorProps) {
  const { config, sample } = useToolsData();
  const host = useEditorHost();
  const [name, setName] = useState(initial.name);
  const [pattern, setPattern] = useState(initial.pattern);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [saving, setSaving] = useState(false);
  const patternRef = useRef<HTMLTextAreaElement>(null);

  const error = validatePattern(pattern);
  const groups = patternGroups(pattern);
  const canSave = !error && name.trim().length > 0 && !saving;
  const dirty = name !== initial.name || pattern !== initial.pattern || enabled !== initial.enabled;

  // The same scanText the rows use, on the one pattern under edit, so chips cannot disagree
  const scan = useMemo(
    () => (error && !/empty string/.test(error) ? null : scanText(sample, [{ id, pattern }])),
    [sample, pattern, id, error]
  );

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), pattern, enabled });
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
  }, [canSave, name, pattern, enabled]);
  useEffect(() => {
    patternRef.current?.focus();
  }, []);

  return (
    <div className={styles.editor} onKeyDown={trapTab} data-testid="term-editor">
      <div className={styles.row2}>
        <div>
          <label className={w.field} htmlFor="term-name">
            Name
          </label>
          <input
            id="term-name"
            type="text"
            className={w.input}
            style={{ width: '100%' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="term-name"
          />
        </div>
        <div>
          <span className={w.field}>Enabled</span>
          <ToggleSwitch
            checked={enabled}
            onChange={setEnabled}
            label="Enabled"
            testId="term-enabled"
          />{' '}
          <span className={classNames(w.dim, w.msg)}>off keeps the term but produces no chips</span>
        </div>
      </div>
      <label className={w.field} htmlFor="term-pattern">
        Pattern, a regex with named groups
      </label>
      <textarea
        id="term-pattern"
        ref={patternRef}
        className={classNames(w.textarea, w.mono)}
        spellCheck={false}
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        data-testid="term-pattern"
      />
      {error && (
        <div className={w.warn} data-testid="term-error">
          {error}
        </div>
      )}
      <div className={styles.meta}>
        produces{' '}
        {groups.length > 0 ? (
          groups.map((g) => (
            <GroupPill
              key={g}
              group={g}
              state={groupState(config.terms, g) === 'orphan' ? 'ok' : groupState(config.terms, g)}
            />
          ))
        ) : (
          <span className={w.dim}>nothing yet, add a (?&lt;name&gt;...) group</span>
        )}
      </div>
      <div className={styles.preview}>
        <div className={styles.previewCap}>This term on the sample text</div>
        {scan && scan.matches.length > 0 ? (
          <ChipsPreview text={sample} scan={scan} />
        ) : (
          <span className={styles.none}>
            {error ? 'fix the pattern to see chips' : 'no matches in the sample'}
          </span>
        )}
      </div>
      {groups.length > 0 && (
        <div className={classNames(styles.meta, styles.uses)}>
          feeds{' '}
          <Consumers
            config={config}
            groups={groups}
            none={`nothing yet. Tools and templates that use ${groups.join(' or ')} will list here.`}
          />
        </div>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={classNames(w.btn, w.primary)}
          disabled={!canSave}
          onClick={save}
          data-testid="term-save"
        >
          Save
        </button>
        <button
          type="button"
          className={classNames(w.btn, w.ghost)}
          onClick={onCancel}
          data-testid="term-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
