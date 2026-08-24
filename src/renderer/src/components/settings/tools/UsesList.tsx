import classNames from 'classnames';
import type { Selection } from './ListPane';
import { consumersOf, producersOf, type ToolsConfig } from './model';
import styles from './Tools.module.css';

interface ItemChipProps {
  kind: 'term' | 'tool' | 'template';
  id: string;
  name: string;
  off?: boolean;
  onGo?: (selection: Selection) => void;
}

export function ItemChip({ kind, id, name, off, onGo }: ItemChipProps) {
  const className = classNames(styles.item, {
    [styles.itemTemplate]: kind === 'template',
    [styles.itemTerm]: kind === 'term',
    [styles.itemOff]: off,
  });
  const label = off ? `${name} (off)` : name;
  if (!onGo) return <span className={className}>{label}</span>;
  return (
    <button
      type="button"
      className={className}
      onClick={() => onGo({ kind, id })}
      data-testid={`go-${kind}-${id}`}
    >
      {label}
    </button>
  );
}

interface ConsumersProps {
  config: ToolsConfig;
  groups: readonly string[];
  none?: string;
  onGo?: (selection: Selection) => void;
}

export function Consumers({
  config,
  groups,
  none = 'nothing uses this yet',
  onGo,
}: ConsumersProps) {
  const tools = new Map<string, string>();
  const templates = new Map<string, string>();
  for (const g of groups) {
    const c = consumersOf(config, g);
    c.tools.forEach((t) => tools.set(t.id, t.name));
    c.templates.forEach((t) => templates.set(t.id, t.name));
  }
  if (tools.size + templates.size === 0) return <span className={styles.none}>{none}</span>;
  return (
    <>
      {[...tools].map(([id, name]) => (
        <ItemChip key={`tool-${id}`} kind="tool" id={id} name={name} onGo={onGo} />
      ))}
      {[...templates].map(([id, name]) => (
        <ItemChip key={`template-${id}`} kind="template" id={id} name={name} onGo={onGo} />
      ))}
    </>
  );
}

interface ProducersProps {
  config: ToolsConfig;
  groups: readonly string[];
  onGo?: (selection: Selection) => void;
}

export function Producers({ config, groups, onGo }: ProducersProps) {
  const seen = new Map<string, { name: string; enabled: boolean }>();
  for (const g of groups) {
    for (const term of producersOf(config.terms, g))
      seen.set(term.id, { name: term.name, enabled: term.enabled });
  }
  if (seen.size === 0)
    return <span className={styles.none}>no search term produces what this needs</span>;
  return (
    <>
      {[...seen].map(([id, term]) => (
        <ItemChip key={id} kind="term" id={id} name={term.name} off={!term.enabled} onGo={onGo} />
      ))}
    </>
  );
}
