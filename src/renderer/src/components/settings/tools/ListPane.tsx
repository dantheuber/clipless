import classNames from 'classnames';
import { useState, type KeyboardEvent } from 'react';
import type { QuickTool, SearchTerm, Template } from '../../../../../shared/types';
import { Dot } from '../shell/Dot';
import { groupStyle } from './GroupPill';
import { ExportImport } from './ExportImport';
import { DOT_TITLE, groupState, listDot, rowGroups, type ToolsKind } from './model';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export interface Selection {
  kind: ToolsKind;
  id: string;
}

interface ListPaneProps {
  selected: Selection | null;
  onSelect: (selection: Selection, how: 'click' | 'keyboard') => void;
  onNew: (kind: ToolsKind) => void;
  onOpenEdit: () => void;
  onToggleTerm: (id: string) => void;
  onDelete: () => void;
}

const SECTIONS: { kind: ToolsKind; label: string }[] = [
  { kind: 'term', label: 'Search terms' },
  { kind: 'tool', label: 'Tools' },
  { kind: 'template', label: 'Templates' },
];

/**
 * The list pane (spec 14.3): three collapsible sections with a count and a +, one row per
 * item with a health dot, the name and the group swatches. Footer: export and import.
 * Keyboard (14.5): Up and Down move the selection, Enter opens Edit, Space toggles a
 * term, Delete asks to delete.
 */
export function ListPane({
  selected,
  onSelect,
  onNew,
  onOpenEdit,
  onToggleTerm,
  onDelete,
}: ListPaneProps) {
  const { config, slotFor } = useToolsData();
  const [open, setOpen] = useState<Record<ToolsKind, boolean>>({
    term: true,
    tool: true,
    template: true,
  });

  const items = (kind: ToolsKind): (SearchTerm | QuickTool | Template)[] =>
    kind === 'term'
      ? [...config.terms]
      : kind === 'tool'
        ? [...config.tools]
        : [...config.templates];

  const flat: Selection[] = SECTIONS.flatMap((s) =>
    open[s.kind] ? items(s.kind).map((item) => ({ kind: s.kind, id: item.id })) : []
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (flat.length === 0) return;
      const at = selected
        ? flat.findIndex((s) => s.kind === selected.kind && s.id === selected.id)
        : -1;
      const next =
        event.key === 'ArrowDown' ? Math.min(flat.length - 1, at + 1) : Math.max(0, at - 1);
      onSelect(flat[next], 'keyboard');
    } else if (event.key === 'Enter' && selected) {
      event.preventDefault();
      onOpenEdit();
    } else if (event.key === ' ' && selected?.kind === 'term') {
      event.preventDefault();
      onToggleTerm(selected.id);
    } else if (event.key === 'Delete' && selected) {
      event.preventDefault();
      onDelete();
    }
  };

  return (
    <div
      className={styles.list}
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-testid="list-pane"
      role="listbox"
    >
      <div className={styles.rows}>
        {SECTIONS.map((section) => (
          <div key={section.kind}>
            <div
              className={classNames(w.sec, styles.section)}
              onClick={() => setOpen((o) => ({ ...o, [section.kind]: !o[section.kind] }))}
              data-testid={`section-${section.kind}`}
            >
              <span>
                {open[section.kind] ? '▾' : '▸'} {section.label}
              </span>
              <span className={classNames(w.dim, styles.sectionCount)}>
                {items(section.kind).length}
              </span>
              <span className={w.sp} />
              <button
                type="button"
                className={classNames(w.btn, w.sm, w.ghost)}
                title={`New ${section.label.toLowerCase().replace(/s$/, '')}`}
                aria-label={`New ${section.kind}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onNew(section.kind);
                }}
                data-testid={`new-${section.kind}`}
              >
                +
              </button>
            </div>
            {open[section.kind] &&
              items(section.kind).map((item) => {
                const dot = listDot(section.kind, item, config.terms);
                const isSelected = selected?.kind === section.kind && selected.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={classNames(styles.row, {
                      [styles.selected]: isSelected,
                      [styles.off]: dot === 'off',
                    })}
                    onClick={() => onSelect({ kind: section.kind, id: item.id }, 'click')}
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`row-${section.kind}-${item.id}`}
                    data-dot={dot}
                  >
                    <Dot kind={dot} title={DOT_TITLE[dot]} />
                    <span className={styles.rowName}>{item.name}</span>
                    <span className={styles.swatches}>
                      {rowGroups(section.kind, item).map((g) => {
                        const orphan = groupState(config.terms, g) === 'orphan';
                        return (
                          <i
                            key={g}
                            className={classNames(styles.swatch, { [styles.swatchOrphan]: orphan })}
                            style={orphan ? undefined : groupStyle(slotFor(g))}
                            title={g}
                          />
                        );
                      })}
                    </span>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      <div className={styles.listFooter}>
        <ExportImport />
        <span className={w.sp} />
        <span>team config</span>
      </div>
    </div>
  );
}
