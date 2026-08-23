import type { ClipItem, ScanResult } from '../../../shared/types';
import { useScanIndex } from '../providers/scan';

/**
 * A clip's scan from the shared index. A thin wrapper so ClipWrapper keeps its badge with
 * no IPC. getScan is a cache lookup, and the provider re-renders its consumers when a
 * deferred scan lands or the terms change, so there is nothing to memoise here. loading is
 * true only while a large clip's deferred scan is pending.
 */
export function usePatternDetection(clip: ClipItem): {
  hasPatterns: boolean;
  scan: ScanResult | null;
  loading: boolean;
} {
  const { getScan } = useScanIndex();
  const scan = getScan(clip);
  return {
    hasPatterns: scan !== null && scan.matches.length > 0,
    scan,
    loading: scan === null,
  };
}
