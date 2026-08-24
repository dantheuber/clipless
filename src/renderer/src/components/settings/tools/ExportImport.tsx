import { useRef, useState } from 'react';
import type { QuickClipsConfig, QuickClipsImportMode } from '../../../../../shared/types';
import { useToast } from '../../useToast';
import { downloadText, readFileText } from '../general/backup';
import { errorText } from '../shell/errorText';
import { useToolsData } from './useToolsData';
import { summarizeConfig, type ConfigSummary } from './configSummary';
import { ExportDialog, ImportDialog } from './ConfigDialogs';
import w from '../shell/widgets.module.css';

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

      <ExportDialog
        config={config}
        json={exportJson}
        error={exportError}
        onCopy={copy}
        onSave={save}
        onClose={() => setExportJson(null)}
      />
      <ImportDialog
        isOpen={importOpen}
        config={config}
        text={importText}
        parsed={parsed}
        error={importError}
        fileRef={file}
        onText={setImportText}
        onFile={onFile}
        onImport={runImport}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
