import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useLanguageDetection } from '../../../providers/languageDetection';
import type { ScanResult } from '../../../../../shared/types';
import { prismLanguage } from '../../quick-look/tokens';
import { Editor } from './Editor';
import { CollapsedLine } from './CollapsedLine';
import styles from './Clip.module.css';
import { ClipTag } from './ClipTag';

interface TextClipProps {
  clip: ClipItem;
  scan: ScanResult | null;
  searchTerm?: string;
  onUpdate: (newContent: string) => void;
  onEditingChange?: (isEditing: boolean) => void;

  editSeq?: number;
}

export const TextClip = ({
  clip,
  scan,
  searchTerm,
  onUpdate,
  onEditingChange,
  editSeq = 0,
}: TextClipProps) => {
  const { isCodeDetectionEnabled, isLanguageLabelEnabled } = useLanguageDetection();
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

  const language = isLanguageLabelEnabled && clip.isCode && clip.language ? clip.language : null;

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
          {language && <ClipTag row>{language}</ClipTag>}
          <CollapsedLine text={clip.content} scan={scan} term={searchTerm} />
        </>
      )}
    </span>
  );
};
