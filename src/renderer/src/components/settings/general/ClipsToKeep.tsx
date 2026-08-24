import classNames from 'classnames';
import { useState } from 'react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { useStats } from './stats';
import { useSetting } from './useSetting';
import { Row } from './Row';
import { CLIPS_MAX, CLIPS_MIN, clipsToKeepLoss, parseClipsToKeep } from './clipsToKeep';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

export function ClipsToKeep() {
  const { value, set, status } = useSetting('maxClips');
  const { stats } = useStats();
  const [text, setText] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const shown = text ?? String(value);
  const bad = text !== null && parseClipsToKeep(text) === null;

  const commit = () => {
    if (text === null) return;
    const next = parseClipsToKeep(text);
    if (next === null) return;
    setText(null);
    if (next === value) return;
    if (stats && next < stats.clipCount) {
      setPending(next);
      return;
    }
    set(next);
  };

  const loss =
    pending !== null && stats ? clipsToKeepLoss(stats.clipCount, stats.lockedCount, pending) : null;
  const total = loss ? loss.unlocked + loss.locked : 0;

  return (
    <Row
      id="maxClips"
      label="Clips to keep"
      description="15 to 100. The oldest unlocked clips go first."
      status={status}
    >
      {bad && <span className={styles.inlineErr}>15 to 100</span>}
      <input
        type="number"
        min={CLIPS_MIN}
        max={CLIPS_MAX}
        value={shown}
        aria-label="Clips to keep"
        className={classNames(w.input, w.number, { [w.bad]: bad })}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setText(null);
        }}
        data-testid="clips-to-keep"
      />
      <ConfirmDialog
        isOpen={pending !== null}
        type="danger"
        title={`Keep ${pending} clips?`}
        message={
          loss && stats ? (
            <p>
              You have <b>{stats.clipCount}</b>. The <b>{loss.unlocked} oldest unlocked</b> clips
              are deleted now.{' '}
              {loss.locked > 0 ? (
                <>
                  Locked clips beyond the limit go too: <b>{loss.locked}</b> of the{' '}
                  {stats.lockedCount} locked.
                </>
              ) : (
                <>Locked clips ({stats.lockedCount}) stay.</>
              )}
            </p>
          ) : null
        }
        confirmText={`Delete ${total} clips`}
        onConfirm={() => {
          set(pending as number, { undo: false });
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </Row>
  );
}
