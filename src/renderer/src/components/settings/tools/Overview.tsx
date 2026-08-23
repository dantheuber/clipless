import { useState } from 'react';
import { GroupPill } from './GroupPill';
import { SampleText } from './SampleText';
import { Bucket } from './Bucket';
import { Consumers, ItemChip } from './UsesList';
import { Fixes, type FixActions } from './Fixes';
import type { Selection } from './ListPane';
import { allGroups, groupState, producersOf } from './model';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface OverviewProps {
  onGo: (selection: Selection) => void;
  fixes: FixActions;
  onPickColour: (group: string, slot: number | null) => void;
}

/**
 * Nothing selected (spec 14.3): the sample text, then one row per group with its pill and
 * sample count, "produced by" and "used by". A group nobody produces shows "nothing" and
 * the fix buttons. Clicking a pill opens the bucket.
 */
export function Overview({ onGo, fixes, onPickColour }: OverviewProps) {
  const { config, values, slotFor, groupColours } = useToolsData();
  const groups = allGroups(config);
  const [bucket, setBucket] = useState<{ group: string; anchor: HTMLElement } | null>(null);

  return (
    <div data-testid="overview">
      <SampleText />
      {groups.length === 0 && (
        <p className={w.empty}>
          No search terms yet. Press + next to Search terms to start from the library.
        </p>
      )}
      {groups.map((g) => {
        const state = groupState(config.terms, g);
        const producers = producersOf(config.terms, g);
        return (
          <div key={g} className={styles.groupRow} data-testid={`group-${g}`}>
            <div>
              <GroupPill
                group={g}
                state={state}
                big
                onClick={(group, anchor) => setBucket({ group, anchor })}
              />
              {values[g]?.length > 0 && (
                <div className={styles.small}>{values[g].length} in sample</div>
              )}
            </div>
            <div>
              <div className={styles.lab}>produced by</div>
              <div className={styles.uses}>
                {producers.length > 0 ? (
                  producers.map((t) => (
                    <ItemChip
                      key={t.id}
                      kind="term"
                      id={t.id}
                      name={t.name}
                      off={!t.enabled}
                      onGo={onGo}
                    />
                  ))
                ) : (
                  <span className={w.warn}>nothing</span>
                )}
              </div>
              {state !== 'ok' && <Fixes config={config} group={g} actions={fixes} />}
            </div>
            <div>
              <div className={styles.lab}>used by</div>
              <div className={styles.uses}>
                <Consumers config={config} groups={[g]} onGo={onGo} />
              </div>
            </div>
          </div>
        );
      })}
      {bucket && (
        <Bucket
          group={bucket.group}
          others={groups.filter((g) => g !== bucket.group)}
          slotFor={slotFor}
          groupColours={groupColours}
          anchor={bucket.anchor}
          onPick={(slot) => {
            onPickColour(bucket.group, slot);
            setBucket(null);
          }}
          onClose={() => setBucket(null)}
        />
      )}
    </div>
  );
}
