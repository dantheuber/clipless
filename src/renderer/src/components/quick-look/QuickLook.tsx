import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import {
  clipText,
  useClipsActions,
  useClipsData,
  useClipsPins,
  useQuickLook,
} from '../../providers/clips';
import { scanKeys } from '../../providers/clips/pins';
import { walkTarget } from '../../providers/clips/quickLook';
import { EMPTY_SCAN, useScanIndex } from '../../providers/scan';
import { useLanguageDetection } from '../../providers/languageDetection';
import { NARROW_WINDOW, SHORT_WINDOW, useMediaQuery } from '../../hooks/useMediaQuery';
import { useToast } from '../useToast';
import { useTemplatePills } from '../useTemplatePills';
import { openTabs } from '../tray/openTabs';
import { useToolUrls } from '../tray/useToolUrls';
import { Header } from './Header';
import { SideColumn } from './SideColumn';
import { Footer } from './Footer';
import { QuickLookBody } from './QuickLookBody';
import { handleQuickLookKeyDown } from './keyboard';
import { clipMeta, clipTag } from './clipMeta';
import { useQuickLookDisplay } from './useQuickLookDisplay';
import { prismLanguage } from './tokens';
import styles from './QuickLook.module.css';

export function QuickLook() {
  const {
    quickLook,
    openClip,
    position,
    closeQuickLook,
    walkQuickLook,
    setView,
    setEditing,
    toggleWrap,
  } = useQuickLook();
  const { clips, filteredClips } = useClipsData();
  const { updateClip, copyClipToClipboard } = useClipsActions();
  const { isPinned, togglePins, pins } = useClipsPins();
  const { getScan } = useScanIndex();
  const { isCodeDetectionEnabled } = useLanguageDetection();
  const toast = useToast();
  const short = useMediaQuery(SHORT_WINDOW);
  const narrow = useMediaQuery(NARROW_WINDOW);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [editValue, setEditValue] = useState('');

  const clip = openClip;
  const clipId = clip?.id ?? null;
  const scan = clip ? (clip.type === 'image' ? EMPTY_SCAN : getScan(clip)) : EMPTY_SCAN;
  const keys = useMemo(() => scanKeys(scan), [scan]);
  const pinnedCount = keys.filter(isPinned).length;
  const { copyFirstReady } = useTemplatePills(scan);
  const { allUrls } = useToolUrls();
  const {
    litKey,
    imageInfo,
    removed,
    sideOpen,
    setImageInfo,
    setSideOpen,
    handleSanitized,
    handleHover,
  } = useQuickLookDisplay(clipId);

  useEffect(() => {
    if (clipId !== null && !quickLook.editing) {
      dialogRef.current?.focus({ preventScroll: true });
    }
  }, [clipId, quickLook.editing]);

  if (!clip || !position) return null;

  const { view, editing, wrap } = quickLook;
  const text = clipText(clip);
  const editable = clip.type === 'text';
  const language = isCodeDetectionEnabled ? prismLanguage(clip.language, clip.isCode) : null;
  const tag = clipTag(clip);
  const meta = clipMeta(clip, imageInfo, text);

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
  const canWalkUp = walkTarget(clips, filteredClips, clip.id, -1) !== null;
  const canWalkDown = walkTarget(clips, filteredClips, clip.id, 1) !== null;

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
        onKeyDown={(event) =>
          handleQuickLookKeyDown(event, {
            clipType: clip.type,
            close: closeQuickLook,
            walk: walkQuickLook,
            pinAll,
            edit: startEdit,
            copy,
            toggleWrap,
            copyFirstReady,
          })
        }
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
          <div className={styles.contentColumn}>
            <QuickLookBody
              clip={clip}
              editing={editing}
              editValue={editValue}
              language={language}
              view={view}
              wrap={wrap}
              text={text}
              scan={scan}
              litKey={litKey}
              onEditValue={setEditValue}
              onCommit={commitEdit}
              onCancel={cancelEdit}
              onImageInfo={setImageInfo}
              onSanitized={handleSanitized}
              onHover={handleHover}
            />
          </div>
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
          onLaunch={() => openTabs(allUrls, toast)}
        />
      </div>
    </>
  );
}
