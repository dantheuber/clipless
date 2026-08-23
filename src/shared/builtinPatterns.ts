import { TLD_PATTERN } from './tlds';

/**
 * The built-in pattern library. It never runs on its own: adding an entry copies it in as an
 * ordinary search term. Group names follow the spec 3 vocabulary; search terms a user added
 * from the old library keep their old names (ipAddress, domainName, ...) because tools
 * reference them.
 */
export interface BuiltinPattern {
  name: string;
  /** A few words on what the pattern covers, shown beside the name on its Start from card */
  description: string;
  pattern: string;
}

export const BUILTIN_PATTERNS: readonly BuiltinPattern[] = [
  {
    name: 'Email Address',
    description: 'user@host, no quoting',
    pattern: '(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  },
  {
    name: 'IPv4 Address',
    description: 'dotted quad',
    pattern:
      '(?<ip>\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b)',
  },
  {
    name: 'Domain Name',
    description: 'checked against the TLD list',
    pattern: `(?<domain>\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)+(${TLD_PATTERN})\\b)`,
  },
  {
    name: 'Phone Number',
    description: 'North American',
    pattern: '(?<phone>\\b(?:\\+?1[-.]?)?\\(?([0-9]{3})\\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\\b)',
  },
  {
    name: 'URL',
    description: 'http and https',
    pattern:
      '(?<url>https?:\\/\\/(?<domain>[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*)(?:\\/[^\\s]*)?)',
  },
  {
    name: 'MAC Address',
    description: 'colon or dash separated',
    pattern:
      '(?<mac>\\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\\b)',
  },
  {
    name: 'IPv6 Address',
    description: 'full form, ::1 and IPv4-mapped',
    pattern:
      '(?<ipv6>\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b|\\b::1\\b|\\b::ffff:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\b)',
  },
  {
    name: 'UUID',
    description: 'v1-5, also called a GUID',
    pattern:
      '(?<guid>\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b)',
  },
];
