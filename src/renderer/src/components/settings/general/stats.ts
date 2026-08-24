import { createContext, useContext } from 'react';
import type { StorageStats } from '../../../../../shared/types';

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
