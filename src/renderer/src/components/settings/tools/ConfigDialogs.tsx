import classNames from 'classnames';
import type { RefObject } from 'react';
import type { QuickClipsImportMode } from '../../../../../shared/types';
import { ConfirmDialog } from '../../ConfirmDialog';
import { GroupPill } from './GroupPill';
import type { ConfigParse } from './configSummary';
import type { ToolsConfig } from './model';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface ExportDialogProps {
  config: ToolsConfig;
  json: string | null;
  error: string | null;
  onCopy: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function ExportDialog({ config, json, error, onCopy, onSave, onClose }: ExportDialogProps) {
  return (
    <ConfirmDialog
      isOpen={json !== null}
      type="info"
      wide
      title="Export config"
      message={
        <>
          <p className={w.dim}>
            Everything below is what your teammates get: {config.terms.length} search terms,{' '}
            {config.tools.length} tools, {config.templates.length} templates, and the group colours.
            Disabled search terms export as disabled.
          </p>
          {error && <p className={w.warn}>{error}</p>}
          <textarea
            className={classNames(w.textarea, styles.jsonBox)}
            readOnly
            value={json ?? ''}
            aria-label="Config JSON"
          />
        </>
      }
      extra={
        <button type="button" className={classNames(w.btn, w.sm)} onClick={onSave} disabled={!json}>
          Save file
        </button>
      }
      confirmText="Copy JSON"
      confirmDisabled={!json}
      cancelText="Close"
      onConfirm={onCopy}
      onCancel={onClose}
    />
  );
}

interface ImportDialogProps {
  isOpen: boolean;
  config: ToolsConfig;
  text: string;
  parsed: ConfigParse;
  error: string | null;
  fileRef: RefObject<HTMLInputElement | null>;
  onText: (text: string) => void;
  onFile: (input: HTMLInputElement) => void;
  onImport: (mode: QuickClipsImportMode) => void;
  onClose: () => void;
}

export function ImportDialog({
  isOpen,
  config,
  text,
  parsed,
  error,
  fileRef,
  onText,
  onFile,
  onImport,
  onClose,
}: ImportDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      type="info"
      wide
      noConfirm
      title="Import config"
      message={
        <>
          <p className={w.dim}>
            Paste a config or pick a file. You see what it adds before anything changes.
          </p>
          <textarea
            className={classNames(w.textarea, styles.jsonBox)}
            value={text}
            spellCheck={false}
            placeholder={'{ "searchTerms": [...], "tools": [...], "templates": [...] }'}
            aria-label="Config to import"
            onChange={(event) => onText(event.target.value)}
            data-testid="import-json"
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={w.hidden}
            aria-label="Config file"
            onChange={(event) => onFile(event.target)}
            data-testid="import-config-file"
          />
          <div className={styles.summary} data-testid="import-summary">
            {'summary' in parsed ? (
              <>
                <span>
                  Adds <b>{parsed.summary.terms}</b> search terms, <b>{parsed.summary.tools}</b>{' '}
                  tools, <b>{parsed.summary.templates}</b> templates
                  {parsed.summary.colours > 0 ? ` and ${parsed.summary.colours} colours.` : '.'}
                </span>
                {parsed.summary.groups.length > 0 && <span>Groups:</span>}
                {parsed.summary.groups.map((group) => (
                  <GroupPill key={group} group={group} />
                ))}
                <span className={w.dim}>
                  Merge adds them to what you have and keeps your colours. Replace all deletes your{' '}
                  {config.terms.length} search terms, {config.tools.length} tools and{' '}
                  {config.templates.length} templates first and takes the file&apos;s colours.
                </span>
              </>
            ) : (
              parsed.error && <span className={w.warn}>{parsed.error}</span>
            )}
            {error && <span className={w.warn}>{error}</span>}
          </div>
        </>
      }
      extra={
        <>
          <button type="button" className={w.link} onClick={() => fileRef.current?.click()}>
            pick a file
          </button>
          <button
            type="button"
            className={classNames(w.btn, w.sm)}
            disabled={!('summary' in parsed)}
            onClick={() => onImport('merge')}
            data-testid="import-merge"
          >
            Merge
          </button>
          <button
            type="button"
            className={classNames(w.btn, w.sm, w.danger)}
            disabled={!('summary' in parsed)}
            onClick={() => onImport('replace')}
            data-testid="import-replace"
          >
            Replace all
          </button>
        </>
      }
      cancelText="Close"
      onCancel={onClose}
    />
  );
}
