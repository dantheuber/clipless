import classNames from 'classnames';
import { useState } from 'react';
import { useToast } from '../../Toast';
import { Pane } from '../shell/Pane';
import { Footer } from '../shell/Footer';
import { Status } from '../shell/Status';
import { Dot } from '../shell/Dot';
import { ToggleSwitch } from '../usersettings/ToggleSwitch';
import { Keycaps } from './Keycaps';
import { Recorder } from './Recorder';
import { useHotkeys, statusKey } from './useHotkeys';
import { rowName, type HotkeyActionId } from './conflicts';
import w from '../shell/widgets.module.css';
import shell from '../shell/Shell.module.css';
import styles from './Hotkeys.module.css';

/**
 * Hotkeys (spec 15.6): the master toggle, then a table of Action, Shortcut, status, On and
 * reset. Clicking the keycaps records in place; a conflict is caught before registration;
 * a refused registration shows "not saved, retry" on the row.
 */
export function Hotkeys() {
  const platform = window.api.platform;
  const toast = useToast();
  const model = useHotkeys(platform);
  const [recording, setRecording] = useState<HotkeyActionId | null>(null);

  const footer = (
    <Footer text="Shortcuts register with the system as soon as they are recorded.">
      <button
        type="button"
        className={w.link}
        onClick={async () => {
          setRecording(null);
          const count = await model.resetAll();
          toast('Reset', `${count} shortcut${count === 1 ? '' : 's'} to defaults`);
        }}
        data-testid="reset-all"
      >
        reset all to defaults
      </button>
    </Footer>
  );

  if (!model.hotkeys) {
    return (
      <Pane title="Hotkeys" footer={footer}>
        <div className={shell.loading}>Loading</div>
      </Pane>
    );
  }

  const on = model.hotkeys.enabled;

  return (
    <Pane title="Hotkeys" footer={footer}>
      <div className={styles.master} data-testid="hotkeys-master" data-control>
        <div>
          <div className={styles.masterName}>Global hotkeys</div>
          <div className={styles.masterDesc}>
            {on
              ? 'Work even when Clipless is minimized or in the background.'
              : 'Off. Nothing below is registered until this is on.'}
          </div>
        </div>
        <span className={w.sp} />
        <Status status={model.masterStatus} testId={`status-${statusKey('enabled')}`} />
        <ToggleSwitch
          checked={on}
          onChange={(enabled) => {
            setRecording(null);
            model.setMaster(enabled);
          }}
          label="Global hotkeys"
          testId="toggle-hotkeys"
        />
      </div>
      <table
        className={classNames(styles.table, { [styles.dimmed]: !on })}
        data-testid="hotkeys-table"
        aria-disabled={!on}
      >
        <thead>
          <tr>
            <th>Action</th>
            <th>Shortcut</th>
            <th />
            <th>On</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row) => (
            <tr
              key={row.id}
              className={classNames({
                [styles.off]: !row.enabled,
                [styles.recording]: recording === row.id,
              })}
              data-testid={`hotkey-${row.id}`}
              data-control
            >
              <td>
                <div className={styles.dotCell}>
                  {row.duplicate && (
                    <Dot kind="orph" title={`also bound to ${rowName(row.duplicate)}`} />
                  )}
                  <span className={styles.name}>{row.name}</span>
                </div>
                <div className={styles.desc}>{row.description}</div>
              </td>
              <td>
                {recording === row.id ? (
                  <Recorder
                    id={row.id}
                    hotkeys={model.hotkeys as NonNullable<typeof model.hotkeys>}
                    platform={platform}
                    onAccept={(accelerator) => {
                      setRecording(null);
                      model.setKey(row.id, accelerator);
                    }}
                    onSwap={(other, accelerator) => {
                      setRecording(null);
                      model.swap(row.id, other, accelerator);
                    }}
                    onCancel={() => setRecording(null)}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.clickable}
                      title="click to change"
                      disabled={!on}
                      onClick={() => on && setRecording(row.id)}
                      data-testid={`keys-${row.id}`}
                    >
                      <Keycaps accelerator={row.key} platform={platform} off={!row.enabled} />
                    </button>
                    <div className={styles.line}>
                      {row.duplicate && (
                        <span className={classNames(w.msg, w.msgErr)}>
                          also bound to {rowName(row.duplicate)}
                        </span>
                      )}
                      {!row.duplicate && row.reserved && (
                        <span className={classNames(w.msg, w.msgWarn)}>
                          {row.reserved}; Clipless may never receive it
                        </span>
                      )}
                    </div>
                  </>
                )}
              </td>
              <td>
                <Status status={row.status} testId={`status-${statusKey(row.id)}`} />
              </td>
              <td>
                <ToggleSwitch
                  checked={row.enabled}
                  onChange={(enabled) => model.setRowEnabled(row.id, enabled)}
                  label={`${row.name} on`}
                  testId={`toggle-${row.id}`}
                />
              </td>
              <td>
                {!row.isDefault && (
                  <button
                    type="button"
                    className={classNames(w.link, styles.reset)}
                    onClick={() => {
                      setRecording(null);
                      model.reset(row.id);
                    }}
                    data-testid={`reset-${row.id}`}
                  >
                    reset
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Pane>
  );
}
