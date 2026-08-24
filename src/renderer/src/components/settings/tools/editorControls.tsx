import classNames from 'classnames';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface EditorActionsProps {
  prefix: string;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditorActions({ prefix, canSave, onSave, onCancel }: EditorActionsProps) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={classNames(w.btn, w.primary)}
        disabled={!canSave}
        onClick={onSave}
        data-testid={`${prefix}-save`}
      >
        Save
      </button>
      <button
        type="button"
        className={classNames(w.btn, w.ghost)}
        onClick={onCancel}
        data-testid={`${prefix}-cancel`}
      >
        Cancel
      </button>
    </div>
  );
}
