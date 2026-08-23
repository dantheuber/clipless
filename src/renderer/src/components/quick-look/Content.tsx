import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import type { ScanResult } from '../../../../shared/types';
import { pinKey } from '../../../../shared/readiness';
import { Chip } from '../clips/clip/Chip';
import { groupByMatch, segmentLine, splitLines, tokenizeLine } from './tokens';
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

  const lines = useMemo(() => {
    return splitLines(text, scan?.matches ?? []).map((line) => {
      const runs = tokenizeLine(line.text, language);
      return { ...line, groups: groupByMatch(segmentLine(runs, line.start, line.matches)) };
    });
  }, [text, language, scan]);

  useEffect(() => {
    if (!litKey || !paneRef.current) return;
    const first = paneRef.current.querySelector<HTMLElement>(`[data-key="${CSS.escape(litKey)}"]`);
    if (first && typeof first.scrollIntoView === 'function') {
      first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [litKey]);

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
      {lines.map((line, i) => (
        <div key={i} className={classNames(styles.line, { [styles.has]: line.matches.length > 0 })}>
          <span className={styles.gutter}>{i + 1}</span>
          <span className={styles.lineText}>
            {line.groups.map((group, j) => {
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
                >
                  {spans}
                </Chip>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
