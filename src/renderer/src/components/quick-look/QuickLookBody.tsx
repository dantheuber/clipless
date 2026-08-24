import type { Dispatch, SetStateAction } from 'react';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import type { QuickLookView } from '../../providers/clips/quickLook';
import { Editor } from '../clips/clip/Editor';
import { Content } from './Content';
import { ImageView } from './ImageView';
import { RenderedView } from './RenderedView';
import { SourceView } from './SourceView';

interface QuickLookBodyProps {
  clip: ClipItem;
  editing: boolean;
  editValue: string;
  language: string | null;
  view: QuickLookView;
  wrap: boolean;
  text: string;
  scan: ScanResult | null;
  litKey: string | null;
  onEditValue: Dispatch<SetStateAction<string>>;
  onCommit: () => void;
  onCancel: () => void;
  onImageInfo: Dispatch<SetStateAction<{ width: number; height: number } | null>>;
  onSanitized: (removed: Record<string, number>) => void;
  onHover: (key: string | null) => void;
}

export function QuickLookBody({
  clip,
  editing,
  editValue,
  language,
  view,
  wrap,
  text,
  scan,
  litKey,
  onEditValue,
  onCommit,
  onCancel,
  onImageInfo,
  onSanitized,
  onHover,
}: QuickLookBodyProps) {
  if (editing) {
    return (
      <Editor
        value={editValue}
        language={language}
        onChange={onEditValue}
        onCommit={onCommit}
        onCancel={onCancel}
        size="reader"
      />
    );
  }
  if (clip.type === 'image') return <ImageView clip={clip} onInfo={onImageInfo} />;
  if (view === 'source') return <SourceView clip={clip} wrap={wrap} />;
  if (view === 'rendered' && clip.type === 'html') {
    return <RenderedView html={clip.content} onSanitized={onSanitized} />;
  }
  return (
    <Content
      text={text}
      language={language}
      scan={scan}
      wrap={wrap}
      litKey={litKey}
      onHover={onHover}
    />
  );
}
