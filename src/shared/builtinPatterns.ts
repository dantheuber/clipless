import { TLD_PATTERN } from './tlds';

/**
 * The built-in pattern library. It never runs on its own: adding an entry copies it in as an
 * ordinary search term. Group names follow the spec 3 vocabulary; search terms a user added
 * from the old library keep their old names (ipAddress, domainName, ...) because tools
 * reference them.
 */
export interface BuiltinPattern {
  name: string;
  pattern: string;
}

export const BUILTIN_PATTERNS: readonly BuiltinPattern[] = [
  {
    name: 'Email Address',
    pattern: '(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  },
  {
    name: 'IP Address',
    pattern:
      '(?<ip>\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b)',
  },
  {
    name: 'Domain Name',
    pattern: `(?<domain>\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)+(${TLD_PATTERN})\\b)`,
  },
  {
    name: 'Phone Number',
    pattern: '(?<phone>\\b(?:\\+?1[-.]?)?\\(?([0-9]{3})\\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\\b)',
  },
  {
    name: 'URL',
    pattern:
      '(?<url>https?:\\/\\/(?<domain>[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*)(?:\\/[^\\s]*)?)',
  },
  {
    name: 'MAC Address',
    pattern:
      '(?<mac>\\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\\b)',
  },
  {
    name: 'IPv6 Address',
    pattern:
      '(?<ipv6>\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b|\\b::1\\b|\\b::ffff:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\b)',
  },
  {
    name: 'GUID',
    pattern:
      '(?<guid>\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b)',
  },
];
