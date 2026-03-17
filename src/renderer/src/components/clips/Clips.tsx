import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useClipsData, useClipsMeta } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import { Clip } from './clip';
import classNames from 'classnames';
import styles from './Clips.module.css';

export function Clips(): React.JSX.Element {
  const { clips, filteredClips, searchTerm } = useClipsData();
  const { clipCopyIndex } = useClipsMeta();
  const { isLight } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isFiltering = searchTerm.trim().length > 0;
  const showEmpty = isFiltering && filteredClips.length === 0;

  const items = isFiltering
    ? filteredClips.map(({ clip, originalIndex }) => ({ clip, index: originalIndex }))
    : clips.map((clip, index) => ({ clip, index }));

  const virtualizer = useVirtualizer({
    count: showEmpty ? 0 : items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div
      ref={scrollContainerRef}
      className={classNames(styles.clipsContainer, { [styles.light]: isLight })}
    >
      {showEmpty ? (
        <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
          No clips match &ldquo;{searchTerm}&rdquo;
        </div>
      ) : (
        <div
          className={styles.clipsList}
          style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const { clip, index } = items[virtualRow.index];
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
                  index={index}
                  isCurrentCopiedClip={clipCopyIndex === index}
                  isEvenRow={virtualRow.index % 2 === 1}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
