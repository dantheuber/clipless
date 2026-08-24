import { useState } from 'react';
import { GroupPill } from './GroupPill';
import { SampleText } from './SampleText';
import { ColourBucket, type ColourBucketTarget } from './ColourBucket';
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

export function Overview({ onGo, fixes, onPickColour }: OverviewProps) {
  const { config, values, slotFor, groupColours } = useToolsData();
  const groups = allGroups(config);
  const [bucket, setBucket] = useState<ColourBucketTarget | null>(null);

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
      <ColourBucket
        target={bucket}
        groups={groups}
        slotFor={slotFor}
        groupColours={groupColours}
        onPickColour={onPickColour}
        onClose={() => setBucket(null)}
      />
    </div>
  );
}
