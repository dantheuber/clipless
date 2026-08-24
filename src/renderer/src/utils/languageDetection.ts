import { LANGUAGE_PATTERNS } from './languagePatterns';

const MAX_TEXT_LENGTH = 10000;
const CACHE_MAX_SIZE = 200;

interface DetectionResult {
  language: string | null;
  isCodeResult: boolean;
}

const detectionCache = new Map<string, DetectionResult>();

function fingerprint(text: string): string {
  return `${text.slice(0, 200)}|${text.length}|${text.slice(-100)}`;
}

function getCached(text: string): DetectionResult | undefined {
  const key = fingerprint(text);
  const result = detectionCache.get(key);
  if (result !== undefined) {
    detectionCache.delete(key);
    detectionCache.set(key, result);
  }
  return result;
}

function setCached(text: string, result: DetectionResult): void {
  const key = fingerprint(text);
  if (detectionCache.size >= CACHE_MAX_SIZE) {
    const firstKey = detectionCache.keys().next().value!;
    detectionCache.delete(firstKey);
  }
  detectionCache.set(key, result);
}

export function clearDetectionCache(): void {
  detectionCache.clear();
}

export function getDetectionCacheSize(): number {
  return detectionCache.size;
}

function detectLanguageInternal(text: string): string | null {
  if (!text || text.trim().length < 5) return null;
  const scores: Record<string, number> = {};
  const lowerText = text.toLowerCase();

  for (const language of LANGUAGE_PATTERNS) {
    let score = 0;
    for (const regex of language.keywordRegexes) {
      regex.lastIndex = 0;
      const matches = lowerText.match(regex);
      if (matches) score += matches.length * 2;
    }
    for (const pattern of language.patterns) {
      const matches = text.match(pattern);
      if (matches) score += matches.length * 3;
    }
    for (const extension of language.extensions) {
      if (lowerText.includes(extension)) score += 5;
    }
    scores[language.name] = score * language.priority;
  }

  let maxScore = 0;
  let detectedLanguage: string | null = null;
  for (const [language, score] of Object.entries(scores)) {
    if (score > maxScore && score > 6) {
      maxScore = score;
      detectedLanguage = language;
    }
  }
  return detectedLanguage;
}

export function detectLanguage(text: string): string | null {
  if (!text || text.trim().length < 5 || text.length > MAX_TEXT_LENGTH) return null;
  const cached = getCached(text);
  if (cached !== undefined) return cached.language;
  const language = detectLanguageInternal(text);
  setCached(text, { language, isCodeResult: isCodeInternal(text) });
  return language;
}

export function isCode(text: string): boolean {
  if (!text || text.trim().length < 3 || text.length > MAX_TEXT_LENGTH) return false;
  const cached = getCached(text);
  if (cached !== undefined) return cached.isCodeResult;
  const isCodeResult = isCodeInternal(text);
  setCached(text, { language: detectLanguageInternal(text), isCodeResult });
  return isCodeResult;
}

const CODE_INDICATORS = [
  /[{}();]/g,
  /\w+\s*=\s*\w+/g,
  /\w+\s*:\s*\w+/g,
  /=>\s*[{(]/g,
  /function\s*\(/g,
  /if\s*\(/g,
  /for\s*\(/g,
  /while\s*\(/g,
  /class\s+\w+/g,
  /interface\s+\w+/g,
  /type\s+\w+\s*=/g,
  /import\s+/g,
  /export\s+/g,
  /include\s*</g,
  /console\./g,
  /\$\w+/g,
  /<\/?\w+.*>/g,
  /\w+\s*:\s*[^;]+;/g,
  /SELECT\s+.*\s+FROM/gi,
  /const\s+\w+/g,
  /let\s+\w+/g,
  /var\s+\w+/g,
  /\.\w+\(/g,
  /new\s+\w+/g,
  /\w+\[\w*\]/g,
];

const STRONG_CODE_INDICATORS = [
  /const\s+\w+\s*=\s*\(/,
  /\w+\s*:\s*\w+\s*\)\s*=>/,
  /if\s*\(\s*\w+\.\w+/,
  /\w+\.\w+\(/,
  /setThemeState|updateEffectiveTheme/,
  /updatedSettings\.\w+/,
  /\}\s*;?\s*$/,
  /\w+Settings\s*:\s*\w+/,
  /=>\s*\{/,
  /\w+\s*:\s*\w+\s*\)\s*=>/,
];

function isCodeInternal(text: string): boolean {
  if (STRONG_CODE_INDICATORS.some((pattern) => pattern.test(text))) return true;
  let indicatorCount = 0;
  let totalMatches = 0;
  for (const pattern of CODE_INDICATORS) {
    const matches = text.match(pattern);
    if (matches) {
      indicatorCount++;
      totalMatches += matches.length;
    }
  }
  const textLength = text.trim().length;
  if (textLength < 20) return indicatorCount >= 1 && totalMatches >= 1;
  if (textLength < 50) return indicatorCount >= 2 || totalMatches >= 3;
  return indicatorCount >= 3 || totalMatches >= 4;
}

const HIGHLIGHTER_LANGUAGES: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  csharp: 'csharp',
  cpp: 'cpp',
  c: 'c',
  html: 'markup',
  css: 'css',
  json: 'json',
  xml: 'xml',
  sql: 'sql',
  bash: 'bash',
  powershell: 'powershell',
};

export function mapToSyntaxHighlighterLanguage(detectedLanguage: string): string {
  return HIGHLIGHTER_LANGUAGES[detectedLanguage] || 'text';
}
