import { languagePattern, type LanguagePattern } from './languagePattern';

export const MARKUP_LANGUAGE_PATTERNS: LanguagePattern[] = [
  languagePattern(
    'html',
    ['.html', '.htm'],
    '<!DOCTYPE <html <head <body <div <span <p <a <img',
    [/<!DOCTYPE\s+html>/i, /<html.*>/, /<\/?\w+.*>/, /<\w+\s+.*=.*>/, /<script.*>/, /<style.*>/],
    8
  ),
  languagePattern(
    'css',
    ['.css'],
    'color background margin padding border font display position width height',
    [
      /\w+\s*:\s*[^;]+;/,
      /\.\w+\s*{/,
      /#\w+\s*{/,
      /@media.*{/,
      /@import/,
      /rgb\s*\(/,
      /rgba\s*\(/,
      /:\s*hover/,
    ],
    7
  ),
  languagePattern(
    'json',
    ['.json'],
    '',
    [
      /^\s*\{[\s\S]*\}\s*$/,
      /^\s*\[[\s\S]*\]\s*$/,
      /"[^"]*"\s*:\s*"[^"]*"/,
      /"[^"]*"\s*:\s*\d+/,
      /"[^"]*"\s*:\s*(true|false|null)/,
    ],
    9
  ),
  languagePattern(
    'xml',
    ['.xml', '.xsd', '.xsl'],
    '<?xml </ <!--',
    [/<\?xml.*\?>/, /<\/?\w+.*>/, /<!--.*-->/, /<\w+\s+.*=.*\/>/],
    7
  ),
  languagePattern(
    'sql',
    ['.sql'],
    'SELECT FROM WHERE INSERT UPDATE DELETE CREATE DROP ALTER TABLE INDEX',
    [
      /SELECT\s+.*\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+.*\s+SET/i,
      /DELETE\s+FROM/i,
      /CREATE\s+TABLE/i,
      /DROP\s+TABLE/i,
      /ALTER\s+TABLE/i,
    ],
    8
  ),
  languagePattern(
    'bash',
    ['.sh', '.bash'],
    '#!/bin/bash #!/bin/sh echo cd ls grep awk sed chmod chown',
    [/^#!/, /\$\w+/, /echo\s+/, /\|\s*grep/, /\|\s*awk/, /chmod\s+/, /cd\s+/],
    6
  ),
  languagePattern(
    'powershell',
    ['.ps1'],
    'Get- Set- New- Remove- $_ ForEach-Object Where-Object',
    [
      /Get-\w+/,
      /Set-\w+/,
      /New-\w+/,
      /\$\w+/,
      /\|\s*ForEach-Object/,
      /\|\s*Where-Object/,
      /Write-Host/,
    ],
    6
  ),
];
