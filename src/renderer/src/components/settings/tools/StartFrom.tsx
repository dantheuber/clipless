import classNames from 'classnames';
import type { SearchTerm } from '../../../../../shared/types';
import { BUILTIN_PATTERNS, type BuiltinPattern } from '../../../../../shared/builtinPatterns';
import { GroupPill } from './GroupPill';
import { libraryGroup, libraryHits, libraryTerm } from './model';
import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

interface StartFromProps {
  /** A library entry to prefill the editor with, or null for blank */
  onPick: (entry: BuiltinPattern | null) => void;
  /** The entry is already a search term: select it, re-enabling it if it is off */
  onExisting: (existing: SearchTerm, disabled: boolean) => void;
}

/**
 * New search term (spec 14.3): one card per library entry with its group pill, name, the
 * regex and "already added" or "finds N in the sample", and a Blank card. The library
 * never runs on its own; picking an entry opens the editor prefilled.
 */
export function StartFrom({ onPick, onExisting }: StartFromProps) {
  const { config, sample } = useToolsData();
  return (
    <div data-testid="start-from">
      <div className={w.sec} style={{ margin: '0 0 8px' }}>
        Start from
      </div>
      <div className={styles.start}>
        {BUILTIN_PATTERNS.map((entry) => {
          const existing = libraryTerm(config.terms, entry);
          const hits = existing ? 0 : libraryHits(sample, entry);
          return (
            <button
              key={entry.name}
              type="button"
              className={classNames(styles.option, { [styles.optionAdded]: Boolean(existing) })}
              onClick={() => (existing ? onExisting(existing, !existing.enabled) : onPick(entry))}
              data-testid={`library-${libraryGroup(entry)}`}
              data-added={existing ? 'true' : undefined}
            >
              <GroupPill group={libraryGroup(entry)} /> <b>{entry.name}</b>{' '}
              <span className={w.dim}>{entry.description}</span>{' '}
              {existing ? (
                <span className={w.dim}>
                  {existing.enabled ? 'already added' : 'already added, off'}
                </span>
              ) : hits > 0 ? (
                <span className={styles.hit}>finds {hits} in the sample</span>
              ) : null}
              <div className={styles.optionPattern} title={entry.pattern}>
                {entry.pattern}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          className={classNames(styles.option, styles.optionBlank)}
          onClick={() => onPick(null)}
          data-testid="library-blank"
        >
          Blank: write a pattern with a (?&lt;name&gt;...) group
        </button>
      </div>
    </div>
  );
}
