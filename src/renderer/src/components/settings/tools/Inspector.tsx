import classNames from 'classnames';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface InspectorProps {
  title: string;
  kind?: string;
  hint?: string;
  tab?: 'edit' | 'uses';
  onTab?: (tab: 'edit' | 'uses') => void;
  onBack?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export function Inspector({
  title,
  kind,
  hint,
  tab,
  onTab,
  onBack,
  onDelete,
  onClose,
  children,
}: InspectorProps) {
  return (
    <div className={styles.inspector} data-testid="inspector">
      <div className={styles.header}>
        {onBack && (
          <button
            type="button"
            className={classNames(w.btn, w.sm, w.ghost)}
            title="Back to overview"
            onClick={onBack}
            data-testid="back"
          >
            <FontAwesomeIcon icon="chevron-left" />
          </button>
        )}
        <span className={styles.title} data-testid="inspector-title">
          {title}
        </span>
        {kind && <span className={styles.kind}>{kind}</span>}
        {hint && <span className={styles.headerHint}>{hint}</span>}
        <span className={w.sp} />
        {onTab && (
          <>
            <button
              type="button"
              className={classNames(styles.itab, { [styles.on]: tab === 'edit' })}
              onClick={() => onTab('edit')}
              data-testid="tab-edit"
            >
              Edit
            </button>
            <button
              type="button"
              className={classNames(styles.itab, { [styles.on]: tab === 'uses' })}
              onClick={() => onTab('uses')}
              data-testid="tab-uses"
            >
              Uses
            </button>
          </>
        )}
        {onDelete && (
          <button
            type="button"
            className={classNames(w.btn, w.sm, w.ghost, w.danger)}
            style={{ marginLeft: 8 }}
            onClick={onDelete}
            data-testid="delete"
          >
            Delete
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className={classNames(w.btn, w.sm, w.ghost)}
            title="Cancel"
            onClick={onClose}
            data-testid="cancel-start"
          >
            <FontAwesomeIcon icon="xmark" />
          </button>
        )}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
