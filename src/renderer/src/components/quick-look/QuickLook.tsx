import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { clipText, useClipsActions, useClipsPins, useQuickLook } from '../../providers/clips';
import { scanKeys } from '../../providers/clips/pins';
import { EMPTY_SCAN, useScanIndex } from '../../providers/scan';
import { useLanguageDetection } from '../../providers/languageDetection';
import { NARROW_WINDOW, SHORT_WINDOW, useMediaQuery } from '../../hooks/useMediaQuery';
import { useToast } from '../Toast';
import { useTemplatePills } from '../TemplatePills';
import { openTabs } from '../tray/Tray';
import { useToolUrls } from '../tray/useToolUrls';
import { Editor } from '../clips/clip/Editor';
import { formatBytes, imageFormat, imageMeta } from '../clips/clip/ImageClip';
import { Header } from './Header';
import { Content } from './Content';
import { SideColumn } from './SideColumn';
import { Footer } from './Footer';
import { ImageView } from './ImageView';
import { SourceView } from './SourceView';
import { RenderedView } from './RenderedView';
import { prismLanguage } from './tokens';
import styles from './QuickLook.module.css';

export const FOCUSABLE =
  'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])';

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;

/** "7 lines · 128 B" */
export function textMeta(text: string): string {
  let lines = text.length === 0 ? 0 : 1;
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10) lines++;
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return `${lines} ${lines === 1 ? 'line' : 'lines'} · ${formatBytes(bytes)}`;
}

/**
 * The reader (spec 5): a dialog over the dimmed list, inside the window. It tracks a clip
 * by id through the provider; this component draws it, traps Tab, and owns the single
 * letter keys while it has focus. Esc inside the editor leaves edit (the editor stops the
 * event); Esc on the dialog closes it and focus returns to the row.
 */
export function QuickLook() {
  const {
    quickLook,
    openClip,
    position,
    walkTargets,
    closeQuickLook,
    walkQuickLook,
    setView,
    setEditing,
    toggleWrap,
  } = useQuickLook();
  const { updateClip, copyClipToClipboard } = useClipsActions();
  const { isPinned, togglePins, pins } = useClipsPins();
  const { getScan } = useScanIndex();
  const { isCodeDetectionEnabled } = useLanguageDetection();
  const toast = useToast();
  const short = useMediaQuery(SHORT_WINDOW);
  const narrow = useMediaQuery(NARROW_WINDOW);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [litKey, setLitKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  const [removed, setRemoved] = useState<Record<string, number> | null>(null);
  const [sideOpen, setSideOpen] = useState(false);

  const clip = openClip;
  const clipId = clip?.id ?? null;
  const scan = clip ? (clip.type === 'image' ? EMPTY_SCAN : getScan(clip)) : EMPTY_SCAN;
  const keys = useMemo(() => scanKeys(scan), [scan]);
  const pinnedCount = keys.filter(isPinned).length;
  const { copyFirstReady } = useTemplatePills(scan);
  const { allUrls } = useToolUrls();

  // Focus the dialog on open and after every walk, unless the editor has it
  useEffect(() => {
    if (clipId !== null && !quickLook.editing) {
      dialogRef.current?.focus({ preventScroll: true });
    }
  }, [clipId, quickLook.editing]);

  // Per-clip state resets when the clip changes
  useEffect(() => {
    setImageInfo(null);
    setRemoved(null);
    setLitKey(null);
  }, [clipId]);

  const handleSanitized = useCallback((r: Record<string, number>) => setRemoved(r), []);
  const handleHover = useCallback((key: string | null) => setLitKey(key), []);

  if (!clip || !position) return null;

  const { view, editing, wrap } = quickLook;
  const text = clipText(clip);
  const editable = clip.type === 'text';
  const language = isCodeDetectionEnabled ? prismLanguage(clip.language, clip.isCode) : null;
  const tag =
    clip.type === 'text'
      ? clip.isCode && clip.language
        ? clip.language
        : null
      : clip.type === 'image'
        ? (imageFormat(clip.thumbnailDataUrl || clip.content)?.toLowerCase() ?? 'image')
        : clip.type === 'bookmark'
          ? 'link'
          : clip.type;
  const meta =
    clip.type === 'image'
      ? imageMeta({
          ...clip,
          ...(imageInfo && { imageWidth: imageInfo.width, imageHeight: imageInfo.height }),
        })
      : textMeta(text);

  const startEdit = () => {
    if (!editable || editing) return;
    setEditValue(clip.content);
    setEditing(true);
  };
  const commitEdit = () => {
    if (editValue !== clip.content) updateClip(position.index, { ...clip, content: editValue });
    setEditing(false);
  };
  const cancelEdit = () => setEditing(false);
  const pinAll = () => {
    if (keys.length > 0) togglePins(keys);
  };
  const copy = () => {
    copyClipToClipboard(position.index);
  };
  const launch = () => {
    openTabs(allUrls, toast);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      // The close button is always there, so the list is never empty
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
      event.preventDefault();
      const at = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? at <= 0
          ? focusable.length - 1
          : at - 1
        : at >= focusable.length - 1
          ? 0
          : at + 1;
      focusable[next].focus();
      return;
    }
    if (isTypingTarget(event.target)) return; // the editor owns its keys, including Esc
    if (event.key === 'Escape') {
      event.preventDefault();
      closeQuickLook();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      walkQuickLook(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      walkQuickLook(-1);
    } else if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    } else if (event.key === 'p') {
      pinAll();
    } else if (event.key === 'e') {
      startEdit();
    } else if (event.key === 'c') {
      copy();
    } else if (event.key === 'w' && clip.type !== 'image') {
      toggleWrap();
    } else if (event.key === 't') {
      copyFirstReady();
    }
  };

  const canWalkUp = walkTargets.up !== null;
  const canWalkDown = walkTargets.down !== null;

  const renderBody = () => {
    if (editing) {
      return (
        <Editor
          value={editValue}
          language={language}
          onChange={setEditValue}
          onCommit={commitEdit}
          onCancel={cancelEdit}
          size="reader"
        />
      );
    }
    if (clip.type === 'image') return <ImageView clip={clip} onInfo={setImageInfo} />;
    if (view === 'source') return <SourceView clip={clip} wrap={wrap} />;
    if (view === 'rendered' && clip.type === 'html') {
      return <RenderedView html={clip.content} onSanitized={handleSanitized} />;
    }
    return (
      <Content
        text={text}
        language={language}
        scan={scan}
        wrap={wrap}
        litKey={litKey}
        onHover={handleHover}
      />
    );
  };

  return (
    <>
      <div
        className={styles.dimmer}
        onClick={closeQuickLook}
        aria-hidden="true"
        data-testid="ql-dimmer"
      />
      <div
        ref={dialogRef}
        className={classNames(styles.dialog, { [styles.short]: short, [styles.narrow]: narrow })}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick look, clip ${position.index + 1}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        data-testid="quick-look"
      >
        <Header
          model={{
            clipNumber: position.index + 1,
            tag,
            meta,
            positionLabel: position.label,
            clipType: clip.type,
            view,
            pinnedCount,
            totalKeys: keys.length,
            editing,
            wrap,
            canWalkUp,
            canWalkDown,
          }}
          onWalk={walkQuickLook}
          onView={setView}
          onPinAll={pinAll}
          onCopy={copy}
          onEdit={editing ? commitEdit : startEdit}
          onWrap={toggleWrap}
          onClose={closeQuickLook}
        />
        <div className={styles.body}>
          <div className={styles.contentColumn}>{renderBody()}</div>
          <SideColumn
            clip={clip}
            view={view}
            scan={scan}
            litKey={litKey}
            onHover={handleHover}
            imageInfo={imageInfo}
            removed={removed}
            folded={narrow}
            open={sideOpen}
            onToggle={() => setSideOpen((open) => !open)}
          />
        </div>
        <Footer
          scan={scan}
          pinnedTotal={pins.size}
          urlCount={allUrls.length}
          short={short}
          onLaunch={launch}
        />
      </div>
    </>
  );
}
