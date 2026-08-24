import { useState } from 'react';
import type { QuickTool, SearchTerm, Template } from '../../../../../shared/types';
import { GroupPill } from './GroupPill';
import { ColourBucket, type ColourBucketTarget } from './ColourBucket';
import { ValueChip } from './ValueChip';
import { Readiness } from './Readiness';
import { Consumers, ItemChip, Producers } from './UsesList';
import { Fixes, type FixActions } from './Fixes';
import type { Selection } from './ListPane';
import {
  allGroups,
  configItemOf,
  consumersOf,
  groupState,
  groupsNeeded,
  groupsProduced,
  isClipTemplate,
  producersOf,
  type ToolsKind,
} from './model';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface UsesProps {
  kind: ToolsKind;
  item: SearchTerm | QuickTool | Template;
  onGo: (selection: Selection) => void;
  fixes: FixActions;
  onPickColour: (group: string, slot: number | null) => void;
}

export function Uses({ kind, item, onGo, fixes, onPickColour }: UsesProps) {
  const { config, values, scan, slotFor, groupColours } = useToolsData();
  const [bucket, setBucket] = useState<ColourBucketTarget | null>(null);
  const open = (group: string, anchor: HTMLElement) => setBucket({ group, anchor });

  const bucketNode = (
    <ColourBucket
      target={bucket}
      groups={allGroups(config)}
      slotFor={slotFor}
      groupColours={groupColours}
      onPickColour={onPickColour}
      onClose={() => setBucket(null)}
    />
  );

  if (kind === 'term') {
    const term = item as SearchTerm;
    const groups = groupsProduced(term);
    return (
      <div data-testid="uses">
        <div className={w.sec}>Produces</div>
        {groups.length === 0 && (
          <p className={w.empty}>
            No named groups, so this term produces nothing. Edit it and add (?&lt;name&gt;...).
          </p>
        )}
        {groups.map((g) => {
          const others = producersOf(config.terms, g).filter((t) => t.id !== term.id);
          return (
            <div key={g} className={styles.tokenRow} data-testid={`produces-${g}`}>
              <div>
                <GroupPill group={g} state={groupState(config.terms, g)} big onClick={open} />
                {values[g]?.length > 0 && (
                  <div className={styles.small}>
                    {values[g].map((v) => (
                      <ValueChip key={v} group={g} value={v} plain />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className={styles.who}>
                  used by{' '}
                  <Consumers
                    config={config}
                    groups={[g]}
                    none={`nothing yet. A tool with {${g}} in its URL would list here.`}
                    onGo={onGo}
                  />
                </div>
                {others.length > 0 && (
                  <div className={styles.small}>
                    also produced by {others.map((t) => t.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {bucketNode}
      </div>
    );
  }

  if (kind === 'template' && isClipTemplate(item as Template)) {
    return (
      <p className={w.empty} data-testid="uses">
        Clip template: positional tokens only. It is filled from the context menu with clip
        contents, not from pins, so it has no producers and never appears in the tray.
      </p>
    );
  }

  const configItem = configItemOf(kind, item as QuickTool | Template);
  const needed = groupsNeeded(configItem);
  return (
    <div data-testid="uses">
      <div className={w.sec}>Needs</div>
      <Readiness item={configItem} terms={config.terms} scan={scan} />
      {needed.map((g) => (
        <div key={g} className={styles.tokenRow} data-testid={`needs-${g}`}>
          <div>
            <GroupPill group={g} state={groupState(config.terms, g)} big onClick={open} />
          </div>
          <div>
            <div className={styles.who}>
              produced by <Producers config={config} groups={[g]} onGo={onGo} />
            </div>
            <Fixes config={config} group={g} actions={fixes} />
          </div>
        </div>
      ))}
      {kind === 'tool' && (
        <>
          <div className={w.sec}>Other tools on the same groups</div>
          <div className={styles.uses}>
            {(() => {
              const others = new Map<string, string>();
              for (const g of needed) {
                for (const t of consumersOf(config, g).tools)
                  if (t.id !== item.id) others.set(t.id, t.name);
              }
              if (others.size === 0) return <span className={styles.none}>none</span>;
              return [...others].map(([id, name]) => (
                <ItemChip key={id} kind="tool" id={id} name={name} onGo={onGo} />
              ));
            })()}
          </div>
        </>
      )}
      {bucketNode}
    </div>
  );
}
