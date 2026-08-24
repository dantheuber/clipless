import classNames from 'classnames';
import { useMemo, useRef, useState } from 'react';
import { scanText } from '../../../../../shared/scan';
import { patternGroups } from '../../../../../shared/readiness';
import { ToggleSwitch } from '../usersettings/ToggleSwitch';
import { GroupPill } from './GroupPill';
import { ChipsPreview } from './ValueChip';
import { Consumers } from './UsesList';
import { trapTab } from './editorHost';
import { EditorActions } from './editorControls';
import { useEditorLifecycle } from './editorHooks';
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

  id?: string;
  onSave: (draft: TermDraft) => void | Promise<void>;
  onCancel: () => void;
}

export function SearchTermEditor({
  initial,
  id = 'draft',
  onSave,
  onCancel,
}: SearchTermEditorProps) {
  const { config, sample } = useToolsData();
  const [name, setName] = useState(initial.name);
  const [pattern, setPattern] = useState(initial.pattern);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [saving, setSaving] = useState(false);
  const patternRef = useRef<HTMLTextAreaElement>(null);

  const error = validatePattern(pattern);
  const groups = patternGroups(pattern);
  const canSave = !error && name.trim().length > 0 && !saving;
  const dirty = name !== initial.name || pattern !== initial.pattern || enabled !== initial.enabled;

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

  useEditorLifecycle({ dirty, canSave, save, focusRef: patternRef });

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
      <EditorActions prefix="term" canSave={canSave} onSave={save} onCancel={onCancel} />
    </div>
  );
}
