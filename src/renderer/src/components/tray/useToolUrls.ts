import { useCallback, useMemo } from 'react';
import type { QuickTool } from '../../../../shared/types';
import { buildToolUrls, toolReady, toolTokens } from '../../../../shared/tools';
import { useClipsPins } from '../../providers/clips';
import { useScanIndex } from '../../providers/scan';

/**
 * The tools the pinned set can launch and every URL they would open, from the one shared
 * buildToolUrls, so the tray's multipliers, Open all and the reader's Launch button agree
 * (spec 8, 17.3). A tool is offered only when every token has a pinned value.
 */
export function useToolUrls(): {
  readyTools: QuickTool[];
  allUrls: string[];
  toolsFor: (group: string) => QuickTool[];
} {
  const { pinsByGroup } = useClipsPins();
  const { tools } = useScanIndex();

  const readyTools = useMemo(
    () => tools.filter((tool) => toolReady(tool, pinsByGroup)),
    [tools, pinsByGroup]
  );

  const allUrls = useMemo(() => {
    const urls: string[] = [];
    for (const tool of readyTools) {
      for (const url of buildToolUrls(tool, pinsByGroup)) {
        if (!urls.includes(url)) urls.push(url);
      }
    }
    return urls;
  }, [readyTools, pinsByGroup]);

  const toolsFor = useCallback(
    (group: string) =>
      readyTools.filter((tool) => toolTokens(tool.url).some((t) => t.groups.includes(group))),
    [readyTools]
  );

  return { readyTools, allUrls, toolsFor };
}
