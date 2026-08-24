import classNames from 'classnames';
import { useState } from 'react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { useToast } from '../../useToast';
import { useScanIndex } from '../../../providers/scan';
import { HOTKEY_ROWS } from '../hotkeys/conflicts';
import { useStats } from './stats';
import { useSettingsStore } from './useSetting';
import { formatBytes } from './backup';
import { errorText } from '../shell/errorText';
import w from '../shell/widgets.module.css';

interface ClearAllProps {
  onExportFirst: () => void;
}

export function ClearAll({ onExportFirst }: ClearAllProps) {
  const toast = useToast();
  const { stats, refresh } = useStats();
  const { reload, commit } = useSettingsStore();
  const { terms, tools, templates } = useScanIndex();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {error && <p className={w.warn}>{error}</p>}
          </>
        }
        extra={
          <button type="button" className={w.link} onClick={onExportFirst}>
            export first
          </button>
        }
        confirmText="Delete everything"
        onConfirm={clear}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
