import classNames from 'classnames';
import { useRef, useState } from 'react';
import type { QuickClipsConfig, QuickClipsImportMode } from '../../../../../shared/types';
import { patternGroups } from '../../../../../shared/readiness';
import { ConfirmDialog } from '../../ConfirmDialog';
import { useToast } from '../../Toast';
import { downloadText, readFileText } from '../general/backup';
import { errorText } from '../../../utils/errorText';
import { GroupPill } from './GroupPill';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export interface ConfigSummary {
  terms: number;
  tools: number;
  templates: number;
  groups: string[];
  colours: number;
}

/**
 * What a pasted config would add, or why it cannot be read (spec 14.4).
 */
export function summarizeConfig(
  text: string
): { summary: ConfigSummary; config: QuickClipsConfig } | { error: string } {
  if (text.trim().length === 0) return { error: '' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Not valid JSON yet.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Not a Quick Clips config: expected an object with searchTerms and tools.' };
  }
  const record = data as Record<string, unknown>;
  const terms = Array.isArray(record.searchTerms) ? record.searchTerms : [];
  const tools = Array.isArray(record.tools) ? record.tools : [];
  const templates = Array.isArray(record.templates) ? record.templates : [];
  if (
    !Array.isArray(record.searchTerms) &&
    !Array.isArray(record.tools) &&
    !Array.isArray(record.templates)
  ) {
    return { error: 'Not a Quick Clips config: it has no searchTerms, tools or templates.' };
  }
  const groups: string[] = [];
  for (const term of terms) {
    const pattern = (term as { pattern?: unknown })?.pattern;
    if (typeof pattern !== 'string') continue;
    for (const g of patternGroups(pattern)) if (!groups.includes(g)) groups.push(g);
  }
  const colours =
    record.groupColours && typeof record.groupColours === 'object'
      ? Object.keys(record.groupColours as object).length
      : 0;
  return {
    summary: {
      terms: terms.length,
      tools: tools.length,
      templates: templates.length,
      groups,
      colours,
    },
    config: record as unknown as QuickClipsConfig,
  };
}

/**
 * The list pane's footer links (spec 14.4): export shows the counts and the JSON, then
 * copies or saves; import shows what the file would add before offering merge or replace.
 * Failure is inline text.
 */
export function ExportImport() {
  const toast = useToast();
  const { config } = useToolsData();
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const openExport = async () => {
    setExportError(null);
    try {
      const exported = await window.api.quickClipsExportConfig();
      setExportJson(JSON.stringify(exported, null, 2));
    } catch (error) {
      setExportError(errorText(error));
      setExportJson('');
    }
  };

  // Copy and Save are enabled only while there is JSON to give
  const copy = async () => {
    const json = exportJson as string;
    await window.api.setClipboardText(json);
    toast('Copied the config', `${json.length} characters`);
    setExportJson(null);
  };

  const save = () => {
    const size = downloadText('clipless-tools-config.json', exportJson as string);
    toast('Saved clipless-tools-config.json', `${size} bytes`);
    setExportJson(null);
  };

  const parsed = summarizeConfig(importText);

  // Merge and Replace are enabled only while the text parses
  const runImport = async (mode: QuickClipsImportMode) => {
    const ready = parsed as { summary: ConfigSummary; config: QuickClipsConfig };
    setImportError(null);
    try {
      await window.api.quickClipsImportConfig(ready.config, mode);
    } catch (error) {
      setImportError(errorText(error));
      return;
    }
    const s = ready.summary;
    toast(
      mode === 'replace' ? 'Replaced the config' : 'Merged the config',
      `${s.terms} search terms, ${s.tools} tools, ${s.templates} templates`
    );
    setImportOpen(false);
    setImportText('');
  };

  const onFile = async (input: HTMLInputElement) => {
    const picked = input.files?.[0];
    if (!picked) return;
    setImportText(await readFileText(picked));
    input.value = '';
  };

  return (
    <>
      <button type="button" className={w.link} onClick={openExport} data-testid="tools-export">
        export
      </button>
      <button
        type="button"
        className={w.link}
        onClick={() => {
          setImportError(null);
          setImportOpen(true);
        }}
        data-testid="tools-import"
      >
        import
      </button>

      <ConfirmDialog
        isOpen={exportJson !== null}
        type="info"
        wide
        title="Export config"
        message={
          <>
            <p className={w.dim}>
              Everything below is what your teammates get: {config.terms.length} search terms,{' '}
              {config.tools.length} tools, {config.templates.length} templates, and the group
              colours. Disabled search terms export as disabled.
            </p>
            {exportError && <p className={w.warn}>{exportError}</p>}
            <textarea
              className={classNames(w.textarea, styles.jsonBox)}
              readOnly
              value={exportJson ?? ''}
              aria-label="Config JSON"
            />
          </>
        }
        extra={
          <button
            type="button"
            className={classNames(w.btn, w.sm)}
            onClick={save}
            disabled={!exportJson}
          >
            Save file
          </button>
        }
        confirmText="Copy JSON"
        confirmDisabled={!exportJson}
        cancelText="Close"
        onConfirm={copy}
        onCancel={() => setExportJson(null)}
      />

      <ConfirmDialog
        isOpen={importOpen}
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
              value={importText}
              spellCheck={false}
              placeholder='{ "searchTerms": [...], "tools": [...], "templates": [...] }'
              aria-label="Config to import"
              onChange={(e) => setImportText(e.target.value)}
              data-testid="import-json"
            />
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              className={w.hidden}
              aria-label="Config file"
              onChange={(e) => onFile(e.target)}
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
                  {parsed.summary.groups.map((g) => (
                    <GroupPill key={g} group={g} />
                  ))}
                  <span className={w.dim}>
                    Merge adds them to what you have and keeps your colours. Replace all deletes
                    your {config.terms.length} search terms, {config.tools.length} tools and{' '}
                    {config.templates.length} templates first and takes the file&apos;s colours.
                  </span>
                </>
              ) : (
                parsed.error && <span className={w.warn}>{parsed.error}</span>
              )}
              {importError && <span className={w.warn}>{importError}</span>}
            </div>
          </>
        }
        extra={
          <>
            <button type="button" className={w.link} onClick={() => file.current?.click()}>
              pick a file
            </button>
            <button
              type="button"
              className={classNames(w.btn, w.sm)}
              disabled={!('summary' in parsed)}
              onClick={() => runImport('merge')}
              data-testid="import-merge"
            >
              Merge
            </button>
            <button
              type="button"
              className={classNames(w.btn, w.sm, w.danger)}
              disabled={!('summary' in parsed)}
              onClick={() => runImport('replace')}
              data-testid="import-replace"
            >
              Replace all
            </button>
          </>
        }
        cancelText="Close"
        onCancel={() => setImportOpen(false)}
      />
    </>
  );
}
