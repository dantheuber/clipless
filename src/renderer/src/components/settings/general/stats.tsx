import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { StorageStats } from '../../../../../shared/types';

/**
 * The storage numbers the General tab shows and confirms with (spec 15.4, 15.5): clip
 * count, locked count and size on disk. Loaded once for the tab; refresh re-reads.
 */
export interface Stats {
  stats: StorageStats | null;
  refresh: () => Promise<void>;
}

export const StatsContext = createContext<Stats | null>(null);

export function useStats(): Stats {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used within StatsProvider');
  return ctx;
}

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<StorageStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStats(await window.api.storageGetStats());
    } catch (error) {
      console.error('Failed to read storage stats:', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ stats, refresh }), [stats, refresh]);
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}
