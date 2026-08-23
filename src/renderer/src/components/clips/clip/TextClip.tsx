import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useLanguageDetection } from '../../../providers/languageDetection';
import type { ScanResult } from '../../../../../shared/types';
import { prismLanguage } from '../../quick-look/tokens';
import { Editor } from './Editor';
import { CollapsedLine } from './CollapsedLine';
import styles from './Clip.module.css';

interface TextClipProps {
  clip: ClipItem;
  scan: ScanResult | null;
  searchTerm?: string;
  onUpdate: (newContent: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
  /** Bumped by the row's Enter key to enter edit from the keyboard */
  editSeq?: number;
}

/**
 * A text row (spec 4): one collapsed line with a language tag for code and a chip on every
 * match. Clicking plain text edits in place; chips are not rendered while editing. Enter
 * commits, Esc restores the pre-edit content; nothing is saved while typing.
 */
export const TextClip = ({
  clip,
  scan,
  searchTerm,
  onUpdate,
  onEditingChange,
  editSeq = 0,
}: TextClipProps) => {
  const { isCodeDetectionEnabled } = useLanguageDetection();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const isEmpty = clip.content.trim() === '';

  const startEdit = () => {
    if (isEmpty || isEditing) return;
    setEditValue(clip.content);
    setIsEditing(true);
    onEditingChange?.(true);
  };

  useEffect(() => {
    if (editSeq > 0) startEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSeq]);

  const stopEdit = () => {
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const commit = () => {
    if (!isEditing) return;
    if (editValue !== clip.content) onUpdate(editValue);
    stopEdit();
  };

  const cancel = () => {
    stopEdit();
  };

  if (isEditing) {
    const language =
      isCodeDetectionEnabled && clip.isCode ? prismLanguage(clip.language, clip.isCode) : null;
    return (
      <Editor
        value={editValue}
        language={language}
        onChange={setEditValue}
        onCommit={commit}
        onCancel={cancel}
        size="row"
      />
    );
  }

  const language = clip.isCode && clip.language ? clip.language : null;

  return (
    <span
      onClick={startEdit}
      className={classNames(styles.editableText, { [styles.emptyText]: isEmpty })}
      title={isEmpty ? 'Empty clip' : 'Click to edit'}
      data-testid="clip-line"
    >
      {isEmpty ? (
        '(empty)'
      ) : (
        <>
          {language && <span className={styles.lang}>{language}</span>}
          <CollapsedLine text={clip.content} scan={scan} term={searchTerm} />
        </>
      )}
    </span>
  );
};
