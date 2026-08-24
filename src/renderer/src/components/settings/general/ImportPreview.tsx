import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { useToast } from '../../useToast';
import { formatBytes, readFileText, summarizeBackup, type BackupSummary } from './backup';
import { errorText } from '../shell/errorText';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

interface Picked {
  name: string;
  size: number;
  text: string;
  summary: BackupSummary | null;
  error: string | null;
}

export function ImportPreview() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await readFileText(file);
    const result = summarizeBackup(text);
    setFailure(null);
    setPicked({
      name: file.name,
      size: file.size,
      text,
      summary: 'summary' in result ? result.summary : null,
      error: 'error' in result ? result.error : null,
    });
    if (input.current) input.current.value = '';
  };

  const replace = async () => {
    const current = picked as Picked;
    const summary = current.summary as BackupSummary;
    try {
      const ok = await window.api.storageImportData(current.text);
      if (!ok) {
        setFailure('The import did not complete; nothing was changed.');
        return;
      }
    } catch (e) {
      setFailure(errorText(e));
      return;
    }
    toast('Imported', `${summary.clips} clips. Restarting`);
    setPicked(null);
    await window.api.restartApp();
  };

  const s = picked?.summary;

  return (
    <>
      <button
        type="button"
        className={w.link}
        onClick={() => input.current?.click()}
        data-testid="import-data"
      >
        import data
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className={styles.fileInput}
        onChange={(e) => onFile(e.target.files?.[0])}
        data-testid="import-file"
        aria-label="Backup file"
      />
      <ConfirmDialog
        isOpen={picked !== null}
        type="info"
        title="Import data"
        message={
          picked ? (
            <>
              <p className={w.dim}>
                {picked.name} · {formatBytes(picked.size)}
              </p>
              {s ? (
                <p>
                  Holds <b>{s.clips} clips</b> ({s.locked} locked),{' '}
                  {s.settings ? 'settings' : 'no settings'}, {s.shortcuts} shortcuts, {s.terms}{' '}
                  search terms, {s.tools} tools, {s.templates} templates. Import <b>replaces</b>{' '}
                  what is here now and restarts Clipless.
                </p>
              ) : (
                <p className={w.warn}>{picked.error}</p>
              )}
              {failure && <p className={w.warn}>{failure}</p>}
            </>
          ) : null
        }
        confirmText="Replace and restart"
        confirmDisabled={!s}
        onConfirm={replace}
        onCancel={() => setPicked(null)}
      />
    </>
  );
}
