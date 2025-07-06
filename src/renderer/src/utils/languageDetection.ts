/**
 * Language detection ut  {
    name: 'typescript',
    extensions: ['.ts', '.tsx'],
    keywords: ['interface', 'type', 'enum', 'namespace', 'declare', 'readonly', 'private', 'public', 'protected', 'const', 'let'],
    patterns: [
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /:\s*(string|number|boolean|void|any|unknown|object)/,
      /enum\s+\w+/,
      /<.*>/,
      /React\.FC/,
      /useState|useEffect|useCallback/,
      /\w+\s*:\s*\w+\s*=>/,        // Arrow function with type annotation
      /=>\s*\{/,                   // Arrow function body
      /const\s+\w+\s*:\s*\w+/,     // Typed constants
      /\w+\.\w+\s*\(/,             // Method calls like setThemeState()
      /\(\w+:\s*\w+\)/,            // Function parameters with types
      /\w+Settings/,               // Common TS naming patterns
      /update\w+\(/,               // Update function patterns
      /const\s+\w+\s*=\s*\(/,      // const functionName = (
      /if\s*\(\w+\.\w+\)/,         // if (object.property)
      /\w+\.\w+\);/,               // method calls with semicolon
    ],
    priority: 8  // Increased priority for better detection
  },snippets
 */

interface LanguagePattern {
  name: string;
  extensions: string[];
  keywords: string[];
  patterns: RegExp[];
  priority: number; // Higher priority wins in case of conflicts
}

const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    name: 'javascript',
    extensions: ['.js', '.jsx', '.mjs'],
    keywords: ['function', 'const', 'let', 'var', 'class', 'extends', 'import', 'export', 'async', 'await', 'console.log', 'if', 'else'],
    patterns: [
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
      /\w+\.\w+\s*\(/,             // Method calls
      /if\s*\(/,                   // Conditionals
      /\{\s*\w+/,                  // Object literals
    ],
    priority: 6  // Increased priority
  },
  {
    name: 'typescript',
    extensions: ['.ts', '.tsx'],
    keywords: ['interface', 'type', 'enum', 'const', 'namespace', 'declare', 'readonly', 'private', 'public', 'protected'],
    patterns: [
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /:\s*(string|number|boolean|void|any|unknown)/,
      /enum\s+\w+/,
      /<.*>/,
      /React\.FC/,
      /useState|useEffect|useCallback/
    ],
    priority: 7
  },
  {
    name: 'python',
    extensions: ['.py', '.pyw'],
    keywords: ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'lambda'],
    patterns: [
      /def\s+\w+\s*\(/,
      /class\s+\w+.*:/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /import\s+\w+/,
      /from\s+\w+\s+import/,
      /print\s*\(/,
      /range\s*\(/,
      /len\s*\(/
    ],
    priority: 6
  },
  {
    name: 'java',
    extensions: ['.java'],
    keywords: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'package'],
    patterns: [
      /public\s+static\s+void\s+main/,
      /public\s+class\s+\w+/,
      /System\.out\.println/,
      /package\s+[\w.]+;/,
      /import\s+[\w.]+;/,
      /@Override/,
      /new\s+\w+\s*\(/
    ],
    priority: 6
  },
  {
    name: 'csharp',
    extensions: ['.cs'],
    keywords: ['using', 'namespace', 'class', 'interface', 'struct', 'enum', 'public', 'private', 'protected', 'internal', 'static', 'readonly'],
    patterns: [
      /using\s+System/,
      /namespace\s+\w+/,
      /public\s+class\s+\w+/,
      /Console\.WriteLine/,
      /string\[\]\s+args/,
      /\[.*Attribute.*\]/,
      /var\s+\w+\s*=/
    ],
    priority: 6
  },
  {
    name: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.c++'],
    keywords: ['#include', 'using', 'namespace', 'class', 'struct', 'template', 'typename', 'public', 'private', 'protected'],
    patterns: [
      /#include\s*<.*>/,
      /std::/,
      /cout\s*<<|cin\s*>>/,
      /using\s+namespace\s+std/,
      /template\s*<.*>/,
      /class\s+\w+.*{/,
      /int\s+main\s*\(/
    ],
    priority: 6
  },
  {
    name: 'c',
    extensions: ['.c', '.h'],
    keywords: ['#include', '#define', 'int', 'char', 'float', 'double', 'void', 'struct', 'typedef', 'static', 'extern'],
    patterns: [
      /#include\s*<stdio\.h>/,
      /#include\s*<stdlib\.h>/,
      /printf\s*\(/,
      /scanf\s*\(/,
      /malloc\s*\(/,
      /free\s*\(/,
      /int\s+main\s*\(/
    ],
    priority: 5
  },
  {
    name: 'html',
    extensions: ['.html', '.htm'],
    keywords: ['<!DOCTYPE', '<html', '<head', '<body', '<div', '<span', '<p', '<a', '<img'],
    patterns: [
      /<!DOCTYPE\s+html>/i,
      /<html.*>/,
      /<\/?\w+.*>/,
      /<\w+\s+.*=.*>/,
      /<script.*>/,
      /<style.*>/
    ],
    priority: 8
  },
  {
    name: 'css',
    extensions: ['.css'],
    keywords: ['color', 'background', 'margin', 'padding', 'border', 'font', 'display', 'position', 'width', 'height'],
    patterns: [
      /\w+\s*:\s*[^;]+;/,
      /\.\w+\s*{/,
      /#\w+\s*{/,
      /@media.*{/,
      /@import/,
      /rgb\s*\(/,
      /rgba\s*\(/,
      /:\s*hover/
    ],
    priority: 7
  },
  {
    name: 'json',
    extensions: ['.json'],
    keywords: [],
    patterns: [
      /^\s*\{[\s\S]*\}\s*$/,
      /^\s*\[[\s\S]*\]\s*$/,
      /"[^"]*"\s*:\s*"[^"]*"/,
      /"[^"]*"\s*:\s*\d+/,
      /"[^"]*"\s*:\s*(true|false|null)/
    ],
    priority: 9
  },
  {
    name: 'xml',
    extensions: ['.xml', '.xsd', '.xsl'],
    keywords: ['<?xml', '</', '<!--'],
    patterns: [
      /<\?xml.*\?>/,
      /<\/?\w+.*>/,
      /<!--.*-->/,
      /<\w+\s+.*=.*\/>/
    ],
    priority: 7
  },
  {
    name: 'sql',
    extensions: ['.sql'],
    keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX'],
    patterns: [
      /SELECT\s+.*\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+.*\s+SET/i,
      /DELETE\s+FROM/i,
      /CREATE\s+TABLE/i,
      /DROP\s+TABLE/i,
      /ALTER\s+TABLE/i
    ],
    priority: 8
  },
  {
    name: 'bash',
    extensions: ['.sh', '.bash'],
    keywords: ['#!/bin/bash', '#!/bin/sh', 'echo', 'cd', 'ls', 'grep', 'awk', 'sed', 'chmod', 'chown'],
    patterns: [
      /^#!/,
      /\$\w+/,
      /echo\s+/,
      /\|\s*grep/,
      /\|\s*awk/,
      /chmod\s+/,
      /cd\s+/
    ],
    priority: 6
  },
  {
    name: 'powershell',
    extensions: ['.ps1'],
    keywords: ['Get-', 'Set-', 'New-', 'Remove-', '$_', 'ForEach-Object', 'Where-Object'],
    patterns: [
      /Get-\w+/,
      /Set-\w+/,
      /New-\w+/,
      /\$\w+/,
      /\|\s*ForEach-Object/,
      /\|\s*Where-Object/,
      /Write-Host/
    ],
    priority: 6
  }
];

/**
 * Detects the programming language of a text snippet
 * @param text The text to analyze
 * @returns The detected language name or null if no language detected
 */
export function detectLanguage(text: string): string | null {
  if (!text || text.trim().length < 5) { // Reduced from 10 to 5
    return null; // Too short to reliably detect
  }

  const scores: Record<string, number> = {};

  // Initialize scores
  LANGUAGE_PATTERNS.forEach(lang => {
    scores[lang.name] = 0;
  });

  const lowerText = text.toLowerCase();

  LANGUAGE_PATTERNS.forEach(lang => {
    let score = 0;

    // Check for keywords
    lang.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length * 2; // Keywords are worth 2 points each
      }
    });

    // Check for patterns
    lang.patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * 3; // Patterns are worth 3 points each
      }
    });

    // Bonus for file extension mentions (if any)
    lang.extensions.forEach(ext => {
      if (lowerText.includes(ext)) {
        score += 5;
      }
    });

    // Apply priority multiplier
    score *= lang.priority;

    scores[lang.name] = score;
  });

  // Find the language with the highest score
  let maxScore = 0;
  let detectedLanguage: string | null = null;

  Object.entries(scores).forEach(([lang, score]) => {
    if (score > maxScore && score > 6) { // Reduced threshold from 10 to 6
      maxScore = score;
      detectedLanguage = lang;
    }
  });

  return detectedLanguage;
}

/**
 * Checks if text appears to be code (any programming language)
 * @param text The text to analyze
 * @returns true if the text appears to be code
 */
export function isCode(text: string): boolean {
  if (!text || text.trim().length < 3) { // Reduced from 5 to 3
    return false;
  }

  // Check for strong code indicators first
  if (hasStrongCodeIndicators(text)) {
    return true;
  }

  // Enhanced code indicators with more patterns
  const codeIndicators = [
    /[{}();]/g,                    // Brackets, parentheses, semicolons
    /\w+\s*=\s*\w+/g,             // Assignments
    /\w+\s*:\s*\w+/g,             // Type annotations, object properties
    /=>\s*[{(]/g,                 // Arrow functions
    /function\s*\(/g,             // Function declarations
    /if\s*\(/g,                   // Conditional statements
    /for\s*\(/g,                  // Loops
    /while\s*\(/g,                // While loops
    /class\s+\w+/g,               // Class declarations
    /interface\s+\w+/g,           // Interface declarations
    /type\s+\w+\s*=/g,           // Type definitions
    /import\s+/g,                 // Import statements
    /export\s+/g,                 // Export statements
    /include\s*</g,               // Include statements
    /console\./g,                 // Console methods
    /\$\w+/g,                     // Variables (shell, PHP, etc.)
    /<\/?\w+.*>/g,                // HTML/XML tags
    /\w+\s*:\s*[^;]+;/g,          // CSS properties
    /SELECT\s+.*\s+FROM/ig,       // SQL queries
    /const\s+\w+/g,               // const declarations
    /let\s+\w+/g,                 // let declarations
    /var\s+\w+/g,                 // var declarations
    /\.\w+\(/g,                   // Method calls
    /new\s+\w+/g,                 // Object instantiation
    /\w+\[\w*\]/g,                // Array/object access
  ];

  let indicatorCount = 0;
  let totalMatches = 0;
  
  codeIndicators.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      indicatorCount += 1;
      totalMatches += matches.length;
    }
  });

  // More lenient detection for small snippets
  const textLength = text.trim().length;
  
  if (textLength < 20) {
    // Very small snippets: need at least 1 strong indicator
    return indicatorCount >= 1 && totalMatches >= 1;
  } else if (textLength < 50) {
    // Small snippets: need at least 2 indicators
    return indicatorCount >= 2 || totalMatches >= 3;
  } else {
    // Larger snippets: use original threshold
    return indicatorCount >= 3 || totalMatches >= 4;
  }
}

/**
 * Enhanced code detection that specifically looks for common code patterns
 * This supplements the main isCode function for better small snippet detection
 */
function hasStrongCodeIndicators(text: string): boolean {
  const strongIndicators = [
    /const\s+\w+\s*=\s*\(/,                    // const handleX = (
    /\w+\s*:\s*\w+\s*\)\s*=>/,                // parameter: Type) =>
    /if\s*\(\s*\w+\.\w+/,                     // if (object.property
    /\w+\.\w+\(/,                             // method calls
    /setThemeState|updateEffectiveTheme/,      // Specific React/state patterns
    /updatedSettings\.\w+/,                    // Object property access
    /\}\s*;?\s*$/,                            // Code block ending
    /\w+Settings\s*:\s*\w+/,                  // Settings type patterns
    /=>\s*\{/,                                // Arrow function with block
    /\w+\s*:\s*\w+\s*\)\s*=>/,                // Typed parameters in arrow functions
  ];

  return strongIndicators.some(pattern => pattern.test(text));
}

/**
 * Maps detected language names to react-syntax-highlighter language identifiers
 */
export function mapToSyntaxHighlighterLanguage(detectedLanguage: string): string {
  const languageMap: Record<string, string> = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'csharp': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'html': 'markup',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'sql': 'sql',
    'bash': 'bash',
    'powershell': 'powershell'
  };

  return languageMap[detectedLanguage] || 'text';
}
