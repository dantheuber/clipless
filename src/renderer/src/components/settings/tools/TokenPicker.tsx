import { GroupPill } from './GroupPill';
import { allGroups, groupState } from './model';
import { useToolsData } from './useToolsData';
import styles from './Tools.module.css';

export function TokenPicker({ onInsert }: { onInsert: (token: string) => void }) {
  const { config } = useToolsData();
  const groups = allGroups(config).filter((g) => groupState(config.terms, g) !== 'orphan');
  return (
    <div className={styles.picker} data-testid="token-picker">
      <span className={styles.pickerLabel}>insert token</span>
      {groups.length === 0 && (
        <span className={styles.pickerLabel}>no search term produces a group yet</span>
      )}
      {groups.map((g) => (
        <GroupPill
          key={g}
          group={g}
          state={groupState(config.terms, g)}
          onClick={() => onInsert(`{${g}}`)}
          title={`insert {${g}}`}
        />
      ))}
    </div>
  );
}
