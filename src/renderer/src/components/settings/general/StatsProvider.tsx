import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StorageStats } from '../../../../../shared/types';
import { StatsContext } from './stats';

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
