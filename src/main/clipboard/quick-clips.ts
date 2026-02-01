import { shell } from 'electron';
import { storage } from '../storage';
import type { PatternMatch, QuickClipsConfig } from '../../shared/types';

// Quick clips scanning functions
export const scanTextForPatterns = async (text: string): Promise<PatternMatch[]> => {
  try {
    const searchTerms = await storage.getSearchTerms();
    const matches: PatternMatch[] = [];

    for (const searchTerm of searchTerms) {
      if (!searchTerm.enabled) continue;

      try {
        const regex = new RegExp(searchTerm.pattern, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
          const captures: Record<string, string> = {};

          // Extract named groups
          if (match.groups) {
            Object.entries(match.groups).forEach(([groupName, value]) => {
              if (value !== undefined && value !== null && typeof value === 'string') {
                captures[groupName] = value;
              }
            });
          }

          if (Object.keys(captures).length > 0) {
            matches.push({
              searchTermId: searchTerm.id,
              searchTermName: searchTerm.name,
              captures,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to test pattern for search term ${searchTerm.name}:`, error);
        // Continue with other patterns
      }
    }

    return matches;
  } catch (error) {
    console.error('Failed to scan text:', error);
    throw error;
  }
};

export const openToolsForMatches = async (matches: PatternMatch[], toolIds: string[]) => {
  try {
    const tools = await storage.getQuickTools();

    for (const toolId of toolIds) {
      const tool = tools.find((t) => t.id === toolId);
      if (!tool) continue;

      // Find matches that contain capture groups needed by this tool
      const applicableMatches = matches.filter((match) =>
        tool.captureGroups.some((group) => group in match.captures)
      );

      if (applicableMatches.length === 0) continue;

      // Parse the URL to find tokens with multiple capture groups (e.g., {email|domain|phone})
      const multiTokenRegex = /\{([^}]+)\}/g;
      const urlsToOpen = new Set<string>();

      // Use the first applicable match to build the URL(s)
      const match = applicableMatches[0];

      // Find all tokens in the URL
      const tokens = [...tool.url.matchAll(multiTokenRegex)];

      if (tokens.length === 0) {
        // No tokens, just open the URL as-is
        urlsToOpen.add(tool.url);
      } else {
        // Process each token
        const tokenReplacements: Array<{ token: string; values: string[]; isUrl: boolean }> = [];

        for (const tokenMatch of tokens) {
          const fullToken = tokenMatch[0]; // e.g., "{email|domain|phone}"
          const tokenContent = tokenMatch[1]; // e.g., "email|domain|phone"
          const captureGroups = tokenContent.split('|').map((g) => g.trim());

          // Find values for this token from the matches
          const values: string[] = [];
          let isUrl = false;
          for (const group of captureGroups) {
            if (group in match.captures && match.captures[group]) {
              values.push(match.captures[group]);
              // Check if this is a URL capture group
              if (group === 'url') {
                isUrl = true;
              }
            }
          }

          tokenReplacements.push({ token: fullToken, values, isUrl });
        }

        // Generate URLs for each combination of values
        if (tokenReplacements.every((tr) => tr.values.length > 0)) {
          // Special case: if the tool URL is just a token that captures a URL, use it directly
          if (
            tokenReplacements.length === 1 &&
            tokenReplacements[0].isUrl &&
            tool.url === tokenReplacements[0].token
          ) {
            tokenReplacements[0].values.forEach((url) => urlsToOpen.add(url));
          } else {
            // Get all combinations of values
            const generateCombinations = (replacements: typeof tokenReplacements): string[] => {
              if (replacements.length === 1) {
                const replacement = replacements[0];
                return replacement.values.map((value) => {
                  // Don't encode URLs if they're being used as direct replacements for URL tokens
                  const encodedValue = replacement.isUrl ? value : encodeURIComponent(value);
                  return tool.url.replace(replacement.token, encodedValue);
                });
              }

              // For multiple tokens, generate all combinations
              const [first, ...rest] = replacements;
              const restCombinations = generateCombinations(rest);
              const combinations: string[] = [];

              for (const value of first.values) {
                for (const restUrl of restCombinations) {
                  // Don't encode URLs if they're being used as direct replacements for URL tokens
                  const encodedValue = first.isUrl ? value : encodeURIComponent(value);
                  const url = restUrl.replace(first.token, encodedValue);
                  combinations.push(url);
                }
              }

              return combinations;
            };

            const combinations = generateCombinations(tokenReplacements);
            combinations.forEach((url) => urlsToOpen.add(url));
          }
        }
      }

      // Open all generated URLs
      for (const url of urlsToOpen) {
        await shell.openExternal(url);
      }
    }
  } catch (error) {
    console.error('Failed to open tools:', error);
    throw error;
  }
};

export const exportQuickClipsConfig = async () => {
  try {
    const searchTerms = await storage.getSearchTerms();
    const tools = await storage.getQuickTools();
    const templates = await storage.getTemplates();

    return {
      searchTerms,
      tools,
      templates,
      version: '1.0.0',
    };
  } catch (error) {
    console.error('Failed to export quick clips config:', error);
    throw error;
  }
};

export const importQuickClipsConfig = async (config: QuickClipsConfig) => {
  try {
    // Use the new batch import method to avoid race conditions
    await storage.importQuickClipsConfig(config);
  } catch (error) {
    console.error('Failed to import quick clips config:', error);
    throw error;
  }
};
