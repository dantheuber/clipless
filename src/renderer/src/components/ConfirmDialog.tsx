import React from 'react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTheme } from '../providers/theme';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
}) => {
  const { isLight } = useTheme();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return 'trash';
      case 'warning':
        return 'exclamation-triangle';
      case 'info':
        return 'info-circle';
      default:
        return 'question-circle';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={classNames(styles.dialog, { [styles.light]: isLight })}>
        <div className={styles.header}>
          <div className={classNames(styles.iconContainer, styles[type])}>
            <FontAwesomeIcon icon={getIcon()} className={styles.icon} />
          </div>
          <h3 className={classNames(styles.title, { [styles.light]: isLight })}>{title}</h3>
        </div>

        <div className={styles.content}>
          <p className={classNames(styles.message, { [styles.light]: isLight })}>{message}</p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={classNames(styles.button, styles.cancelButton, { [styles.light]: isLight })}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={classNames(styles.button, styles.confirmButton, styles[type], {
              [styles.light]: isLight,
            })}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
