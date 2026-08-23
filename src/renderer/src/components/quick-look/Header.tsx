import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import type { ClipType } from '../../../../shared/types';
import type { QuickLookView } from '../../providers/clips/quickLook';
import styles from './QuickLook.module.css';

export interface HeaderModel {
  clipNumber: number;
  tag: string | null; // language or type tag
  meta: string; // "7 lines · 128 B"
  positionLabel: string;
  clipType: ClipType;
  view: QuickLookView;
  pinnedCount: number;
  totalKeys: number;
  editing: boolean;
  wrap: boolean;
  canWalkUp: boolean;
  canWalkDown: boolean;
}

interface HeaderProps {
  model: HeaderModel;
  onWalk: (direction: -1 | 1) => void;
  onView: (view: QuickLookView) => void;
  onPinAll: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onWrap: () => void;
  onClose: () => void;
}

interface ButtonProps {
  icon: IconProp;
  title: string;
  on?: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
  testId: string;
}

function IconButton({ icon, title, on, disabled, label, onClick, testId }: ButtonProps) {
  return (
    <button
      type="button"
      className={classNames(styles.ibtn, { [styles.on]: on })}
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      <FontAwesomeIcon icon={icon} />
      {label && <span className={styles.ibtnLabel}>{label}</span>}
    </button>
  );
}

/**
 * The reader header (spec 5): previous and next, clip number, tag, line count and size,
 * position, the view switch for html and rtf, then pin all with its count, copy, edit,
 * wrap and close. Under 480px the size text drops (CSS) and every button stays.
 */
export function Header({
  model,
  onWalk,
  onView,
  onPinAll,
  onCopy,
  onEdit,
  onWrap,
  onClose,
}: HeaderProps) {
  const editable = model.clipType === 'text';
  const wrappable = model.clipType !== 'image';
  const views: QuickLookView[] =
    model.clipType === 'html'
      ? ['text', 'source', 'rendered']
      : model.clipType === 'rtf'
        ? ['text', 'source']
        : [];
  const allPinned = model.totalKeys > 0 && model.pinnedCount === model.totalKeys;

  return (
    <div className={styles.header} data-testid="ql-header">
      <IconButton
        icon="arrow-up"
        title="Previous clip (Up)"
        disabled={!model.canWalkUp}
        onClick={() => onWalk(-1)}
        testId="ql-prev"
      />
      <IconButton
        icon="arrow-down"
        title="Next clip (Down)"
        disabled={!model.canWalkDown}
        onClick={() => onWalk(1)}
        testId="ql-next"
      />
      <span className={styles.clipNo} data-testid="ql-clip-number">
        Clip {model.clipNumber}
      </span>
      <span className={styles.meta}>
        {model.tag && <span className={styles.lang}>{model.tag}</span>}
        <span className={styles.metaText}>{model.meta}</span>
      </span>
      <span className={styles.pos} data-testid="ql-position">
        {model.positionLabel}
      </span>
      {views.length > 0 && (
        <span className={styles.seg} role="group" aria-label="View">
          {views.map((view) => (
            <button
              key={view}
              type="button"
              className={classNames(styles.segButton, { [styles.on]: model.view === view })}
              onClick={() => onView(view)}
              aria-pressed={model.view === view}
              data-testid={`ql-view-${view}`}
            >
              {view}
            </button>
          ))}
        </span>
      )}
      <span className={styles.spacer} />
      <IconButton
        icon="thumbtack"
        title={allPinned ? 'Unpin all values in this clip (p)' : 'Pin all values in this clip (p)'}
        on={allPinned}
        disabled={model.totalKeys === 0}
        label={model.totalKeys > 0 ? `${model.pinnedCount}/${model.totalKeys}` : undefined}
        onClick={onPinAll}
        testId="ql-pin-all"
      />
      <IconButton
        icon="copy"
        title="Copy clip to clipboard (c)"
        onClick={onCopy}
        testId="ql-copy"
      />
      <IconButton
        icon="edit"
        title={editable ? 'Edit (e)' : `${model.clipType} clips cannot be edited`}
        on={model.editing}
        disabled={!editable}
        onClick={onEdit}
        testId="ql-edit"
      />
      <IconButton
        icon="text-width"
        title={wrappable ? 'Wrap long lines (w)' : 'Images do not wrap'}
        on={model.wrap}
        disabled={!wrappable}
        onClick={onWrap}
        testId="ql-wrap"
      />
      <IconButton icon="xmark" title="Close (Esc)" onClick={onClose} testId="ql-close" />
    </div>
  );
}
