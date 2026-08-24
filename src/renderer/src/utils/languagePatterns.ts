import { MARKUP_LANGUAGE_PATTERNS } from './markupLanguagePatterns';
import { languagePattern, type LanguagePattern } from './languagePattern';

const SCRIPT_LANGUAGE_PATTERNS: LanguagePattern[] = [
  languagePattern(
    'javascript',
    ['.js', '.jsx', '.mjs'],
    'function const let var class extends import export async await console.log if else',
    [
      /console\.log\s*\(/,
      /function\s+\w+\s*\(/,
      /=>\s*[{(]/,
      /require\s*\(\s*['"`]/,
      /import\s+.*\s+from\s+['"`]/,
      /export\s+(default\s+)?/,
      /\.addEventListener\s*\(/,
      /document\.(getElementById|querySelector)/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /\w+\.\w+\s*\(/,
      /if\s*\(/,
      /\{\s*\w+/,
    ],
    6
  ),
  languagePattern(
    'typescript',
    ['.ts', '.tsx'],
    'interface type enum const namespace declare readonly private public protected',
    [
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /:\s*(string|number|boolean|void|any|unknown)/,
      /enum\s+\w+/,
      /<.*>/,
      /React\.FC/,
      /useState|useEffect|useCallback/,
    ],
    7
  ),
  languagePattern(
    'python',
    ['.py', '.pyw'],
    'def class import from if elif else for while try except finally with as lambda',
    [
      /def\s+\w+\s*\(/,
      /class\s+\w+.*:/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /import\s+\w+/,
      /from\s+\w+\s+import/,
      /print\s*\(/,
      /range\s*\(/,
      /len\s*\(/,
    ],
    6
  ),
  languagePattern(
    'java',
    ['.java'],
    'public private protected static final abstract class interface extends implements package',
    [
      /public\s+static\s+void\s+main/,
      /public\s+class\s+\w+/,
      /System\.out\.println/,
      /package\s+[\w.]+;/,
      /import\s+[\w.]+;/,
      /@Override/,
      /new\s+\w+\s*\(/,
    ],
    6
  ),
  languagePattern(
    'csharp',
    ['.cs'],
    'using namespace class interface struct enum public private protected internal static readonly',
    [
      /using\s+System/,
      /namespace\s+\w+/,
      /public\s+class\s+\w+/,
      /Console\.WriteLine/,
      /string\[\]\s+args/,
      /\[.*Attribute.*\]/,
      /var\s+\w+\s*=/,
    ],
    6
  ),
  languagePattern(
    'cpp',
    ['.cpp', '.cc', '.cxx', '.c++'],
    '#include using namespace class struct template typename public private protected',
    [
      /#include\s*<.*>/,
      /std::/,
      /cout\s*<<|cin\s*>>/,
      /using\s+namespace\s+std/,
      /template\s*<.*>/,
      /class\s+\w+.*{/,
      /int\s+main\s*\(/,
    ],
    6
  ),
  languagePattern(
    'c',
    ['.c', '.h'],
    '#include #define int char float double void struct typedef static extern',
    [
      /#include\s*<stdio\.h>/,
      /#include\s*<stdlib\.h>/,
      /printf\s*\(/,
      /scanf\s*\(/,
      /malloc\s*\(/,
      /free\s*\(/,
      /int\s+main\s*\(/,
    ],
    5
  ),
];

export const LANGUAGE_PATTERNS = [...SCRIPT_LANGUAGE_PATTERNS, ...MARKUP_LANGUAGE_PATTERNS];
