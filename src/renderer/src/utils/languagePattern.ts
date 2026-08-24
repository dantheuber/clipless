export interface LanguagePattern {
  name: string;
  extensions: string[];
  keywords: string[];
  keywordRegexes: RegExp[];
  patterns: RegExp[];
  priority: number;
}

export function languagePattern(
  name: string,
  extensions: string[],
  keywordList: string,
  patterns: RegExp[],
  priority: number
): LanguagePattern {
  const keywords = keywordList ? keywordList.split(' ') : [];
  return {
    name,
    extensions,
    keywords,
    keywordRegexes: keywords.map((keyword) => new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')),
    patterns,
    priority,
  };
}
