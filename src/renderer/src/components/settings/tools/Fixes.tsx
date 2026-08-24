import classNames from 'classnames';
import { BUILTIN_PATTERNS, type BuiltinPattern } from '../../../../../shared/builtinPatterns';
import type { SearchTerm } from '../../../../../shared/types';
import { libraryGroup, libraryTerm, producersOf, type ToolsConfig } from './model';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export interface FixActions {
  enableTerm: (term: SearchTerm) => void;
  addLibrary: (entry: BuiltinPattern) => void;
  newTermFor: (group: string) => void;
}

export function Fixes({
  config,
  group,
  actions,
}: {
  config: ToolsConfig;
  group: string;
  actions: FixActions;
}) {
  const producers = producersOf(config.terms, group);
  if (producers.some((t) => t.enabled)) return null;
  const entry = BUILTIN_PATTERNS.find(
    (e) => libraryGroup(e) === group && !libraryTerm(config.terms, e)
  );
  return (
    <div className={styles.fixes} data-testid={`fixes-${group}`}>
      {producers.length > 0 && (
        <button
          type="button"
          className={classNames(w.btn, w.sm)}
          onClick={() => actions.enableTerm(producers[0])}
        >
          enable {producers[0].name}
        </button>
      )}
      {entry && (
        <button
          type="button"
          className={classNames(w.btn, w.sm)}
          onClick={() => actions.addLibrary(entry)}
        >
          add &quot;{entry.name}&quot; from the library
        </button>
      )}
      <button
        type="button"
        className={classNames(w.btn, w.sm)}
        onClick={() => actions.newTermFor(group)}
      >
        new term for {group}
      </button>
    </div>
  );
}
