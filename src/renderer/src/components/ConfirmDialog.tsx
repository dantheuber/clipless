import React, { useEffect } from 'react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;

  onConfirm?: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';

  extra?: React.ReactNode;
  confirmDisabled?: boolean;

  noConfirm?: boolean;
  wide?: boolean;
}

const ICONS = { danger: 'trash', warning: 'exclamation-triangle', info: 'info-circle' } as const;

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  extra,
  confirmDisabled = false,
  noConfirm = false,
  wide = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      event.preventDefault();
      onCancel();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={classNames(styles.dialog, styles[type], { [styles.wide]: wide })}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <FontAwesomeIcon icon={ICONS[type]} className={styles.icon} />
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          {extra}
          <span className={styles.spacer} />
          <button type="button" onClick={onCancel} className={styles.button}>
            {cancelText}
          </button>
          {!noConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={classNames(styles.button, styles.confirmButton, styles[type])}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
