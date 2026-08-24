import { Fragment, useEffect, useState } from 'react';
import classNames from 'classnames';
import type { HotkeySettings } from '../../../../../shared/types';
import { displayKeys } from './display';
import { findConflict, reservedReason, rowName, type HotkeyActionId } from './conflicts';
import {
  buildAccelerator,
  hasRequiredModifier,
  isModifierPress,
  keyNameOf,
  modifiersOf,
} from './recording';
import w from '../shell/widgets.module.css';
import styles from './Hotkeys.module.css';

interface RecorderProps {
  id: HotkeyActionId;
  hotkeys: HotkeySettings;
  platform: string;
  onAccept: (accelerator: string) => void;
  onSwap: (other: HotkeyActionId, accelerator: string) => void;
  onCancel: () => void;
}

type Message =
  | { kind: 'needMod' }
  | { kind: 'conflict'; other: HotkeyActionId; accelerator: string }
  | null;

export function Recorder({ id, hotkeys, platform, onAccept, onSwap, onCancel }: RecorderProps) {
  const [mods, setMods] = useState<string[]>([]);
  const [key, setKey] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      const held = modifiersOf(event, platform);
      if (isModifierPress(event)) {
        setMods(held);
        setKey(null);
        setMessage(null);
        return;
      }
      const name = keyNameOf(event) as string;
      setMods(held);
      setKey(name);
      if (!hasRequiredModifier(held)) {
        setMessage({ kind: 'needMod' });
        return;
      }
      const accelerator = buildAccelerator(held, name);
      const other = findConflict(hotkeys, id, accelerator, platform);
      if (other) {
        setMessage({ kind: 'conflict', other, accelerator });
        return;
      }
      onAccept(accelerator);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isModifierPress(event)) setMods(modifiersOf(event, platform));
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [hotkeys, id, platform, onAccept, onCancel]);

  const shown = displayKeys(buildAccelerator(mods, key ?? ''), platform);
  const names = displayKeys('CommandOrControl+Shift+Alt', platform);
  const reserved =
    message?.kind === 'conflict'
      ? null
      : key && mods.length
        ? reservedReason(buildAccelerator(mods, key), platform)
        : null;

  return (
    <div data-testid="recorder">
      <span className={classNames(w.kc, styles.rec)}>
        {shown.map((part, i) => (
          <Fragment key={i}>
            {i > 0 && <span className={w.plus}>+</span>}
            <kbd>{part}</kbd>
          </Fragment>
        ))}
        {shown.length > 0 && <span className={w.plus}>+</span>}
        <span className={styles.ell}>…</span>
        <span className={styles.hint}>press keys, Esc cancels</span>
      </span>
      <div className={styles.line}>
        {message?.kind === 'needMod' && (
          <span className={classNames(w.msg, w.msgErr)} data-testid="recorder-message">
            needs {names[0]}, {names[1]} or {names[2]}
          </span>
        )}
        {message?.kind === 'conflict' && (
          <span className={classNames(w.msg, w.msgErr)} data-testid="recorder-message">
            used by {rowName(message.other)}
            <button
              type="button"
              className={w.link}
              onClick={() => onSwap(message.other, message.accelerator)}
            >
              swap
            </button>
            <button type="button" className={w.link} onClick={() => setMessage(null)}>
              keep trying
            </button>
          </span>
        )}
        {reserved && (
          <span className={classNames(w.msg, w.msgWarn)}>
            {reserved}; Clipless may never receive it
          </span>
        )}
      </div>
    </div>
  );
}
