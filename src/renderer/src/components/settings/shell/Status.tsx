import classNames from 'classnames';
import type { RowStatus } from '../general/useSetting';
import styles from './Shell.module.css';
import w from './widgets.module.css';

export function Status({ status, testId }: { status: RowStatus | undefined; testId?: string }) {
  if (!status) return <span className={styles.status} data-testid={testId} />;
  if (status.kind === 'saving') {
    return (
      <span className={classNames(styles.status, styles.statusBusy)} data-testid={testId}>
        saving
      </span>
    );
  }
  if (status.kind === 'error') {
    return (
      <span
        className={classNames(styles.status, styles.statusErr)}
        data-testid={testId}
        title={status.message}
      >
        not saved
        <button type="button" className={w.link} onClick={status.retry}>
          retry
        </button>
      </span>
    );
  }
  return (
    <span className={classNames(styles.status, styles.statusOk)} data-testid={testId}>
      {status.label && 'saved'}
      {status.undo && (
        <button type="button" className={w.link} onClick={status.undo}>
          undo
        </button>
      )}
    </span>
  );
}
