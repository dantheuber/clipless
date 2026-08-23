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

/**
 * One scan per clip, in the renderer, with no IPC (spec 17.3). The Quick Clips config
 * (search terms, tools, templates, group colours) loads once and reloads when the main
 * process broadcasts quick-clips-config-changed, which also clears the cache. getScan scans
 * on a miss or when the clip's text changed, so an edit re-scans exactly one clip. Rows,
 * the reader, the tray and readiness all read the same result.
 *
 * Clips above the 256 KB threshold are scanned in an idle callback rather than during
 * render; getScan returns null until that lands and the row shows no chips meanwhile.
 */

// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_SCAN: ScanResult = { matches: [], groups: [], errors: [], large: false };

/** Entries beyond this are evicted oldest first; maxClips is at most 100. */
// eslint-disable-next-line react-refresh/only-export-components
export const SCAN_CACHE_LIMIT = 500;

interface ScanEntry {
  contentKey: string;
  result: ScanResult | null; // null while a deferred scan is pending
}

export interface ScanIndex {
  /** False until the first load answers; the Tools tab shows one loading state on it */
  loaded: boolean;
  terms: SearchTerm[];
  tools: QuickTool[];
  templates: Template[];
  /** The stored overrides, slot per group; the Bucket shows and edits them (spec 14.4) */
  groupColours: GroupColours;
  /** The scan for a clip, or null while a large clip's scan is still pending. */
  getScan: (clip: ClipItem) => ScanResult | null;
  /** The colour bucket slot a capture group renders in (spec 17.2). */
  slotFor: (group: string) => number;
  /** Bumps when the cache clears or a deferred scan lands, so consumers re-read. */
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

/**
 * Every group in every search term, in term order, so slot assignment is the same on
 * every render (spec 17.2).
 */
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
  // null until the first load answers: nothing is scanned against an empty term list
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
      if (cached && cached.contentKey === text) return cached.result;

      if (isLargeText(text)) {
        const entry: ScanEntry = { contentKey: text, result: null };
        remember(clip.id, entry);
        scheduleIdle(() => {
          // Skip if the clip changed, or the terms changed and cleared the cache, meanwhile
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
