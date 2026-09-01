import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import type { ScanResult } from '../../../../shared/types';
import { pinKey } from '../../../../shared/readiness';
import { Chip } from '../clips/clip/Chip';
import { groupByMatch, indexedLine, indexLines, segmentLine, tokenizeLine } from './tokens';
import styles from './QuickLook.module.css';

interface ContentProps {
  text: string;
  language: string | null;
  scan: ScanResult | null; // null while a large clip's scan is pending: no chips yet
  wrap: boolean;
  litKey: string | null;
  onHover?: (key: string | null) => void;
}

/**
 * The reader's content pane (spec 5): one grid row per line with a sticky gutter, syntax
 * colouring for code, a chip on every match, lines with a match faintly tinted. Hovering a
 * side column value outlines its occurrences and scrolls the first into view.
 */
export function Content({ text, language, scan, wrap, litKey, onHover }: ContentProps) {
  const paneRef = useRef<HTMLDivElement>(null);

  const lineIndex = useMemo(() => indexLines(text, scan?.matches ?? []), [text, scan]);
  const virtualizer = useVirtualizer({
    count: lineIndex.starts.length,
    getScrollElement: () => paneRef.current,
    estimateSize: () => 20,
    overscan: 8,
  });

  useEffect(() => {
    if (!litKey || !paneRef.current) return;
    const match = scan?.matches.find(
      (candidate) => pinKey(candidate.group, candidate.value) === litKey
    );
    if (!match) return;
    let line = 0;
    while (line + 1 < lineIndex.starts.length && lineIndex.starts[line + 1] <= match.start) line++;
    virtualizer.scrollToIndex(line, { align: 'auto' });
    const scrollToChip = (): boolean => {
      const first = paneRef.current?.querySelector<HTMLElement>(
        `[data-key="${CSS.escape(litKey)}"]`
      );
      if (first && typeof first.scrollIntoView === 'function') {
        first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return true;
      }
      return false;
    };
    if (scrollToChip()) return;
    const frame = requestAnimationFrame(scrollToChip);
    return () => cancelAnimationFrame(frame);
  }, [litKey, lineIndex, scan, virtualizer]);

  // Reset scroll when the clip changes
  useEffect(() => {
    const pane = paneRef.current!; // mounted before any effect runs
    pane.scrollTop = 0;
    pane.scrollLeft = 0;
  }, [text]);

  return (
    <div
      ref={paneRef}
      className={classNames(styles.pane, { [styles.wrap]: wrap })}
      data-testid="ql-content"
    >
      <div className={styles.virtualLines} style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualLine) => {
          const line = indexedLine(text, lineIndex, virtualLine.index);
          const runs = tokenizeLine(line.text, language);
          const groups = groupByMatch(segmentLine(runs, line.start, line.matches));
          return (
            <div
              key={virtualLine.key}
              data-index={virtualLine.index}
              ref={virtualizer.measureElement}
              className={classNames(styles.line, styles.virtualLine, {
                [styles.has]: line.matches.length > 0,
              })}
              style={{ top: `${virtualLine.start}px` }}
            >
              <span className={styles.gutter}>{virtualLine.index + 1}</span>
              <span className={styles.lineText}>
                {groups.map((group, j) => {
                  const spans = group.segments.map((segment, k) => (
                    <span
                      key={k}
                      className={segment.classes.map((cls) => `tok-${cls}`).join(' ') || undefined}
                    >
                      {line.text.slice(segment.start, segment.end)}
                    </span>
                  ));
                  if (!group.match) return spans;
                  const key = pinKey(group.match.group, group.match.value);
                  return (
                    <Chip
                      key={`m${j}`}
                      group={group.match.group}
                      value={group.match.value}
                      lit={litKey === key}
                      onHover={onHover}
                      tabbable
                    >
                      {spans}
                    </Chip>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
