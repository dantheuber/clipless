import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ClipItem,
  GroupColours,
  QuickTool,
  ScanResult,
  SearchTerm,
  Template,
} from '../../../shared/types';
import { scanText, isLargeText } from '../../../shared/scan';
import { assignGroupSlots, resolveGroupSlot } from '../../../shared/groupColours';
import { patternGroups } from '../../../shared/readiness';
import { clipText } from './clips/utils';

// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_SCAN: ScanResult = { matches: [], groups: [], errors: [], large: false };

// eslint-disable-next-line react-refresh/only-export-components
export const SCAN_CACHE_LIMIT = 500;

interface ScanEntry {
  contentKey: string;
  result: ScanResult | null;
}

export interface ScanIndex {
  loaded: boolean;
  terms: SearchTerm[];
  tools: QuickTool[];
  templates: Template[];
  groupColours: GroupColours;
  getScan: (clip: ClipItem) => ScanResult | null;
  slotFor: (group: string) => number;
  version: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ScanIndexContext = createContext<ScanIndex | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useScanIndex = (): ScanIndex => {
  const ctx = useContext(ScanIndexContext);
  if (!ctx) throw new Error('useScanIndex must be used within ScanIndexProvider');
  return ctx;
};

const scheduleIdle = (work: () => void): void => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(work);
  } else {
    setTimeout(work, 0);
  }
};

interface QuickClipsConfigState {
  terms: SearchTerm[];
  tools: QuickTool[];
  templates: Template[];
  groupColours: GroupColours;
}

// eslint-disable-next-line react-refresh/only-export-components
export function knownGroups(terms: readonly Pick<SearchTerm, 'pattern'>[]): string[] {
  const groups: string[] = [];
  for (const term of terms) {
    for (const group of patternGroups(term.pattern)) {
      if (!groups.includes(group)) groups.push(group);
    }
  }
  return groups;
}

export function ScanIndexProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<QuickClipsConfigState | null>(null);
  const [version, setVersion] = useState(0);
  const cache = useRef(new Map<string, ScanEntry>());

  const loadConfig = useCallback(async () => {
    try {
      const [terms, tools, templates, groupColours] = await Promise.all([
        window.api.searchTermsGetAll(),
        window.api.quickToolsGetAll(),
        window.api.templatesGetAll(),
        window.api.groupColoursGet(),
      ]);
      cache.current.clear();
      setConfig({ terms, tools, templates, groupColours: groupColours ?? {} });
      setVersion((v) => v + 1);
    } catch (error) {
      console.error('Failed to load the Quick Clips config for scanning:', error);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    return window.api.onQuickClipsConfigChanged(loadConfig);
  }, [loadConfig]);

  const remember = useCallback((id: string, entry: ScanEntry) => {
    const map = cache.current;
    map.delete(id);
    map.set(id, entry);
    while (map.size > SCAN_CACHE_LIMIT) {
      const oldest = map.keys().next().value as string;
      map.delete(oldest);
    }
  }, []);

  const terms = config?.terms ?? null;

  const getScan = useCallback(
    (clip: ClipItem): ScanResult | null => {
      const text = clipText(clip);
      if (text.length === 0 || terms === null) return EMPTY_SCAN;

      const cached = cache.current.get(clip.id);
      if (cached?.contentKey === text) return cached.result;

      if (isLargeText(text)) {
        const entry: ScanEntry = { contentKey: text, result: null };
        remember(clip.id, entry);
        scheduleIdle(() => {
          if (cache.current.get(clip.id) !== entry) return;
          entry.result = scanText(text, terms);
          setVersion((v) => v + 1);
        });
        return null;
      }

      const result = scanText(text, terms);
      remember(clip.id, { contentKey: text, result });
      return result;
    },
    [terms, remember]
  );

  const slots = useMemo(() => {
    const groups = knownGroups(config?.terms ?? []);
    return { groups, assigned: assignGroupSlots(config?.groupColours, groups) };
  }, [config]);

  const slotFor = useCallback(
    (group: string): number =>
      slots.assigned.get(group) ?? resolveGroupSlot(group, config?.groupColours, slots.groups),
    [slots, config]
  );

  const value = useMemo(
    () => ({
      loaded: config !== null,
      terms: config?.terms ?? [],
      tools: config?.tools ?? [],
      templates: config?.templates ?? [],
      groupColours: config?.groupColours ?? {},
      getScan,
      slotFor,
      version,
    }),
    [config, getScan, slotFor, version]
  );

  return <ScanIndexContext.Provider value={value}>{children}</ScanIndexContext.Provider>;
}
