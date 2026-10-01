import classNames from 'classnames';
import { useState } from 'react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { useToast } from '../../Toast';
import { useScanIndex } from '../../../providers/scan';
import { HOTKEY_ROWS } from '../hotkeys/conflicts';
import { useStats } from './stats';
import { useSettingsStore } from './useSetting';
import { formatBytes } from './backup';
import { errorText } from '../../../utils/errorText';
import w from '../shell/widgets.module.css';

interface ClearAllProps {
  /** Saves a backup; resolves to whether one was written */
  onExportFirst: () => Promise<boolean>;
}

/**
 * Where "export first" stands. Deletion is off while a backup is being written and after
 * one fails: the export reads every image file, so a deletion running alongside it would
 * remove the images first and the backup would fail after the history was already gone.
 */
type BackupState = 'none' | 'pending' | 'failed' | 'saved';

/**
 * Clear all data (spec 15.5): names the clip count and locked count, every setting, the
 * shortcuts, every search term, tool and template, and the size on disk; offers "export
 * first" and a Delete everything button. There is no undo.
 */
export function ClearAll({ onExportFirst }: ClearAllProps) {
  const toast = useToast();
  const { stats, refresh } = useStats();
  const { reload, commit } = useSettingsStore();
  const { terms, tools, templates } = useScanIndex();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backup, setBackup] = useState<BackupState>('none');

  const exportFirst = async () => {
    setBackup('pending');
    const saved = await onExportFirst();
    setBackup(saved ? 'saved' : 'failed');
  };

  const clear = async () => {
    setError(null);
    try {
      const ok = await window.api.storageClearAll();
      if (!ok) {
        setError('Clipless could not delete its data.');
        return;
      }
      setOpen(false);
      toast('Cleared', `${stats?.clipCount ?? 0} clips and every setting`);
      await refresh();
      await reload();
      // Re-apply the defaults in the main process: window settings, login item, hotkeys
      await commit({}, [], { undo: false });
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <button
        type="button"
        className={classNames(w.link, w.linkDanger)}
        onClick={() => {
          setError(null);
          // A backup still being written stays pending across reopen, so deletion stays off
          setBackup((b) => (b === 'pending' ? b : 'none'));
          setOpen(true);
        }}
        data-testid="clear-all"
      >
        clear all data
      </button>
      <ConfirmDialog
        isOpen={open}
        type="danger"
        title="Clear all data?"
        message={
          <>
            <p>
              Deletes <b>{stats?.clipCount ?? 0} clips</b> ({stats?.lockedCount ?? 0} of them
              locked), every setting, all {HOTKEY_ROWS.length} shortcuts, and every search term (
              {terms.length}), tool ({tools.length}) and template ({templates.length}).{' '}
              {formatBytes(stats?.dataSize ?? 0)} on disk.
            </p>
            <p>There is no undo. Export first if you might want any of it back.</p>
            {backup === 'failed' && (
              <p className={w.warn} data-testid="clear-all-backup-failed">
                The backup was not saved, so nothing is deleted. Export again, or cancel.
              </p>
            )}
            {error && <p className={w.warn}>{error}</p>}
          </>
        }
        extra={
          <button
            type="button"
            className={w.link}
            onClick={exportFirst}
            disabled={backup === 'pending'}
          >
            {backup === 'pending' ? 'exporting…' : 'export first'}
          </button>
        }
        confirmText="Delete everything"
        confirmDisabled={backup === 'pending' || backup === 'failed'}
        onConfirm={clear}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
