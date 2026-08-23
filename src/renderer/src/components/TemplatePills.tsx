import { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import type { ScanResult, Template } from '../../../shared/types';
import { listTokens, templateReadiness, type TemplateReadiness } from '../../../shared/readiness';
import { generateTextFromTemplate } from '../../../shared/templates';
import { clipText, useClipsData, useClipsPins } from '../providers/clips';
import { useScanIndex } from '../providers/scan';
import { useToast } from './Toast';
import styles from './TemplatePills.module.css';

/**
 * The templates strip shared by the tray footer and the reader footer (spec 7). Ready is a
 * solid pill that copies; not ready is dimmed and names the missing tokens; in the reader a
 * not-ready pill pins the missing values from the open clip when it has them all, and is
 * inert with an explaining tooltip when it does not. Clip templates (no named tokens) never
 * appear here.
 */

export interface Pill {
  template: Template;
  readiness: Exclude<TemplateReadiness, { kind: 'clip-template' }>;
  state: 'ready' | 'needs' | 'inert';
  label: string;
  title: string;
  activate: () => void;
}

/** "ip 203.0.113.42 (first of 2)" per token */
export function usedValues(readiness: Extract<TemplateReadiness, { kind: 'ready' }>): string[] {
  return Object.entries(readiness.values).map(([token, value]) => {
    const count = readiness.counts[token];
    return count > 1 ? `${token} ${value} (first of ${count})` : `${token} ${value}`;
  });
}

export function useTemplatePills(openClipScan?: ScanResult | null): {
  pills: Pill[];
  copyFirstReady: () => boolean;
} {
  const { templates } = useScanIndex();
  const { pinsByGroup, setPins } = useClipsPins();
  const { clips } = useClipsData();
  const toast = useToast();

  const copy = useCallback(
    async (template: Template, readiness: Extract<TemplateReadiness, { kind: 'ready' }>) => {
      const text = generateTextFromTemplate(template, clips.map(clipText), readiness.values);
      try {
        await window.api.setClipboardText(text);
        toast(
          `Copied "${template.name}" to the clipboard (${text.length} chars)`,
          usedValues(readiness)
        );
      } catch (error) {
        console.error('Failed to copy template text:', error);
        toast(`Could not copy "${template.name}"`, String(error));
      }
    },
    [clips, toast]
  );

  const pills = useMemo<Pill[]>(() => {
    const result: Pill[] = [];
    for (const template of templates) {
      const readiness = templateReadiness(template, pinsByGroup, openClipScan ?? undefined);
      if (readiness.kind === 'clip-template') continue;
      if (readiness.kind === 'ready') {
        result.push({
          template,
          readiness,
          state: 'ready',
          label: template.name,
          title: `Copy "${template.name}" using ${usedValues(readiness).join(', ')}`,
          activate: () => {
            copy(template, readiness);
          },
        });
        continue;
      }
      const label = `${template.name} needs ${readiness.missing.join(' + ')}`;
      if (readiness.pins) {
        const keys = readiness.pins;
        const named = keys.map((key) => key.replace('|', ' '));
        const values = keys.map((key) => key.slice(key.indexOf('|') + 1));
        result.push({
          template,
          readiness,
          state: 'needs',
          label,
          title: `Click to pin ${named.join(', ')} from this clip`,
          activate: () => {
            setPins(keys, true);
            toast(
              `Pinned ${values.join(', ')} for "${template.name}"`,
              'Click the template again to copy it.'
            );
          },
        });
      } else {
        const lacking = listTokens(readiness.lacking);
        const plural = readiness.lacking.length > 1;
        result.push({
          template,
          readiness,
          state: 'inert',
          label,
          title: openClipScan
            ? `Needs ${listTokens(readiness.missing)}. ${lacking} ${plural ? 'are' : 'is'} not in this clip; pin ${plural ? 'them' : 'it'} from another clip.`
            : `Needs ${listTokens(readiness.missing)}. Pin ${plural ? 'them' : 'it'} from a clip.`,
          activate: () => {},
        });
      }
    }
    return result;
  }, [templates, pinsByGroup, openClipScan, copy, setPins, toast]);

  const copyFirstReady = useCallback((): boolean => {
    const first = pills.find((pill) => pill.state === 'ready');
    if (!first) {
      toast('No template is ready', 'Pin the values a template needs; the footer shows which.');
      return false;
    }
    first.activate();
    return true;
  }, [pills, toast]);

  return { pills, copyFirstReady };
}

interface TemplatePillsProps {
  openClipScan?: ScanResult | null;
  /** Hide not-ready pills (the short window in the reader footer) */
  readyOnly?: boolean;
  showLabel?: boolean;
}

export function TemplatePills({ openClipScan, readyOnly, showLabel = true }: TemplatePillsProps) {
  const { pills } = useTemplatePills(openClipScan);
  const shown = readyOnly ? pills.filter((p) => p.state === 'ready') : pills;
  if (shown.length === 0) return null;
  return (
    <span className={styles.pills} data-testid="template-pills">
      {showLabel && <span className={styles.label}>Templates</span>}
      {shown.map((pill) => (
        <button
          key={pill.template.id}
          type="button"
          className={classNames(styles.pill, {
            [styles.needs]: pill.state !== 'ready',
            [styles.inert]: pill.state === 'inert',
          })}
          title={pill.title}
          aria-disabled={pill.state === 'inert' ? 'true' : undefined}
          data-state={pill.state}
          onClick={pill.state === 'inert' ? undefined : pill.activate}
        >
          {pill.template.name}
          {pill.readiness.kind === 'needs' && (
            <span className={styles.need}>needs {pill.readiness.missing.join(' + ')}</span>
          )}
        </button>
      ))}
    </span>
  );
}
