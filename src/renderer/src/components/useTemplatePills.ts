import { useCallback, useMemo } from 'react';
import type { ScanResult, Template } from '../../../shared/types';
import { listTokens, templateReadiness, type TemplateReadiness } from '../../../shared/readiness';
import { generateTextFromTemplate } from '../../../shared/templates';
import { clipText, useClipsData, useClipsPins } from '../providers/clips';
import { useScanIndex } from '../providers/scan';
import { useToast } from './useToast';

export interface Pill {
  template: Template;
  readiness: Exclude<TemplateReadiness, { kind: 'clip-template' }>;
  state: 'ready' | 'needs' | 'inert';
  label: string;
  title: string;
  activate: () => void;
}

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
