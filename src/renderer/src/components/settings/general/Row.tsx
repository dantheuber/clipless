import classNames from 'classnames';
import type { ReactNode } from 'react';
import type { UserSettings } from '../../../../../shared/types';
import { Status } from '../shell/Status';
import { Tooltip } from '../shell/Tooltip';
import { ToggleSwitch } from '../usersettings/ToggleSwitch';
import { useSetting, type RowStatus } from './useSetting';
import w from '../shell/widgets.module.css';
import styles from './General.module.css';

interface RowProps {
  id: string;
  label: string;
  description: string;
  status?: RowStatus;
  dimmed?: boolean;
  tight?: boolean;
  children: ReactNode;
}

/**
 * A row is a label and a control (spec 15.4); the description is the label's tooltip and
 * the status slot sits between them.
 */
export function Row({ id, label, description, status, dimmed, tight, children }: RowProps) {
  return (
    <div
      className={classNames(styles.row, { [styles.dimmed]: dimmed, [styles.tight]: tight })}
      data-testid={`row-${id}`}
      data-control
    >
      <div className={styles.label}>
        <Tooltip text={description}>{label}</Tooltip>
      </div>
      <div className={styles.controls}>
        <Status status={status} testId={`status-${id}`} />
        {children}
      </div>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.panel} data-testid={`panel-${title.toLowerCase()}`}>
      <div className={classNames(w.sec, styles.sec)}>{title}</div>
      {children}
    </section>
  );
}

type BooleanKey = {
  [K in keyof UserSettings]-?: UserSettings[K] extends boolean | undefined ? K : never;
}[keyof UserSettings];

interface ToggleRowProps {
  id: BooleanKey;
  label: string;
  description: string;
  dimmed?: boolean;
  tight?: boolean;
}

/** A boolean setting as a row: the toggle applies at once and reports beside itself. */
export function ToggleRow({ id, label, description, dimmed, tight }: ToggleRowProps) {
  const { value, set, status } = useSetting(id);
  return (
    <Row
      id={id}
      label={label}
      description={description}
      status={status}
      dimmed={dimmed}
      tight={tight}
    >
      <ToggleSwitch
        checked={value === true}
        onChange={(checked) => set(checked)}
        disabled={dimmed}
        label={label}
        testId={`toggle-${id}`}
      />
    </Row>
  );
}
