import { useCallback, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useClipsData, useClipsMeta, useQuickLook } from '../../providers/clips';
import { Clip } from './clip';
import { SEARCH_INPUT_ID } from '../SearchBar';
import styles from './Clips.module.css';

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;

/**
 * The list. Rows are keyboard focusable: Up and Down move focus, / opens search, and Down
 * past the last row returns to the search input when the bar is open (spec 16 rule 2).
 * The list is virtualised, so focusing a row the reader returns to means scrolling it into
 * view first and focusing on the next frame (spec 17.1).
 */
export function Clips(): React.JSX.Element {
  const { filteredClips, searchTerm, isFiltering, pinnedOnly } = useClipsData();
  const { clipCopyId, isSearchVisible, setIsSearchVisible } = useClipsMeta();
  const { focusRequest } = useQuickLook();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const showEmpty = isFiltering && filteredClips.length === 0;
  const items = filteredClips;

  const virtualizer = useVirtualizer({
    count: showEmpty ? 0 : items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  const focusRow = useCallback(
    (visibleIndex: number) => {
      if (visibleIndex < 0 || visibleIndex >= items.length) return;
      virtualizer.scrollToIndex(visibleIndex);
      requestAnimationFrame(() => {
        const row = scrollContainerRef.current?.querySelector<HTMLElement>(
          `[data-row-index="${visibleIndex}"]`
        );
        row?.focus({ preventScroll: true });
      });
    },
    [items.length, virtualizer]
  );

  // Focus return from the reader (and the search bar's hand-off) name a real row index
  const lastFocusSeq = useRef(0);
  useEffect(() => {
    if (!focusRequest || focusRequest.seq === lastFocusSeq.current) return;
    lastFocusSeq.current = focusRequest.seq;
    const visibleIndex = items.findIndex((item) => item.originalIndex === focusRequest.index);
    focusRow(visibleIndex);
  }, [focusRequest, items, focusRow]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(event.target)) return;
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-row-index]');
    if (event.key === '/') {
      event.preventDefault();
      setIsSearchVisible(true);
      return;
    }
    if (!row) return;
    const current = Number(row.dataset.rowIndex);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (current + 1 < items.length) {
        focusRow(current + 1);
      } else if (isSearchVisible) {
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (current > 0) focusRow(current - 1);
    }
  };

  const emptyMessage =
    pinnedOnly && !searchTerm.trim()
      ? 'No clips contain a pinned value'
      : `No clips match "${searchTerm.trim()}"`;

  return (
    <div
      ref={scrollContainerRef}
      className={styles.clipsContainer}
      onKeyDown={handleKeyDown}
      data-testid="clips-list"
    >
      {showEmpty ? (
        <div className={styles.emptyState}>{emptyMessage}</div>
      ) : (
        <div
          className={styles.clipsList}
          style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const { clip, originalIndex } = items[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Clip
                  clip={clip}
                  index={originalIndex}
                  visibleIndex={virtualRow.index}
                  isCurrentCopiedClip={clipCopyId === clip.id}
                  isEvenRow={virtualRow.index % 2 === 1}
                  searchTerm={searchTerm}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
