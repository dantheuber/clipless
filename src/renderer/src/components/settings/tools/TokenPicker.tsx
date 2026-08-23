import { GroupPill } from './GroupPill';
import { allGroups, groupState } from './model';
import { useToolsData } from './useToolsData';
import styles from './Tools.module.css';

/**
 * The token picker (spec 14.4): groups that have a producer; groups whose only producers
 * are disabled are dimmed. The pipe form is parsed but never offered.
 */
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

/**
 * Insert text at the caret of an input and put the caret after it.
 */
export function insertAtCaret(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string
): { value: string; caret: number } {
  const start = input?.selectionStart ?? value.length;
  const end = input?.selectionEnd ?? value.length;
  return { value: value.slice(0, start) + token + value.slice(end), caret: start + token.length };
}
