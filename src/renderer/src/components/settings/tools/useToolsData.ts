import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { GroupColours, ScanResult, StoredClip } from '../../../../../shared/types';
import { scanText, valuesByGroup } from '../../../../../shared/scan';
import { useScanIndex } from '../../../providers/scan';
import { clipText } from '../../../providers/clips/utils';
import { useSettingsStore } from '../general/useSetting';
import type { ToolsConfig } from './model';

export interface ToolsData {
  loaded: boolean;
  config: ToolsConfig;
  groupColours: GroupColours;
  slotFor: (group: string) => number;

  sample: string;

  sampleIsClip: boolean;
  setSample: (text: string) => void;

  saveSample: () => Promise<void>;

  resetSample: () => Promise<void>;
  scan: ScanResult;
  values: Record<string, string[]>;

  version: number;
}

export const ToolsDataContext = createContext<ToolsData | null>(null);

export function useToolsData(): ToolsData {
  const ctx = useContext(ToolsDataContext);
  if (!ctx) throw new Error('useToolsData must be used within ToolsDataProvider');
  return ctx;
}

export function newestClipText(clips: readonly StoredClip[]): string {
  for (const stored of clips) {
    const text = stored?.clip ? clipText(stored.clip) : '';
    if (text.trim().length > 0) return text;
  }
  return '';
}

export function useToolsDataValue(): ToolsData {
  const index = useScanIndex();
  const { settings, commit } = useSettingsStore();
  const saved = settings?.toolsSampleText;
  const [clip, setClip] = useState('');
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    window.api
      .storageGetClips()
      .then((clips) => {
        if (live) setClip(newestClipText(clips ?? []));
      })
      .catch((error) => console.error('Failed to read the newest clip:', error));
    return () => {
      live = false;
    };
  }, []);

  const sample = draft ?? saved ?? clip;
  const sampleIsClip = draft === null && saved === undefined;

  const saveSample = useCallback(async () => {
    if (draft === null) return;
    const text = draft.trim().length > 0 ? draft : undefined;
    setDraft(null);
    if (text === saved) return;
    await commit({ toolsSampleText: text }, ['toolsSampleText'], { undo: false });
  }, [draft, saved, commit]);

  const resetSample = useCallback(async () => {
    setDraft(null);
    if (saved === undefined) return;
    await commit({ toolsSampleText: undefined }, ['toolsSampleText'], { undo: false });
  }, [saved, commit]);

  const scan = useMemo(() => scanText(sample, index.terms), [sample, index.terms]);
  const values = useMemo(() => valuesByGroup(scan), [scan]);
  const config = useMemo<ToolsConfig>(
    () => ({ terms: index.terms, tools: index.tools, templates: index.templates }),
    [index.terms, index.tools, index.templates]
  );

  return useMemo(
    () => ({
      loaded: index.loaded,
      config,
      groupColours: index.groupColours,
      slotFor: index.slotFor,
      sample,
      sampleIsClip,
      setSample: setDraft,
      saveSample,
      resetSample,
      scan,
      values,
      version: index.version,
    }),
    [
      index.version,
      index.loaded,
      index.groupColours,
      index.slotFor,
      config,
      sample,
      sampleIsClip,
      saveSample,
      resetSample,
      scan,
      values,
    ]
  );
}
