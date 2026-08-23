/**
 * Curated, non-sensitive demo data used to populate the app for documentation
 * screenshots. The content is themed around a security/IT analyst workflow so
 * the Quick Clips patterns, Quick Tools, and Templates all reinforce each other
 * in the captured images.
 *
 * All values are fictional (example.com / RFC 5737 documentation IP ranges).
 */
import type { ClipItem } from '../../src/shared/types';

export interface DemoClip {
  clip: ClipItem;
  /** Locked clips are pinned; index 0 can never be locked. */
  locked?: boolean;
}

/** Clips ordered most-recent-first (index 0 is the live clipboard entry). */
export const DEMO_CLIPS: DemoClip[] = [
  {
    clip: {
      id: 'demo-1',
      type: 'text',
      content:
        'Investigating alert: failed logins from 203.0.113.42 for mreyes@example.com (ref INC-4821)',
    },
  },
  {
    clip: {
      id: 'demo-2',
      type: 'text',
      content: [
        '{',
        '  "event": "auth_failure",',
        '  "user": "mreyes@example.com",',
        '  "sourceIp": "203.0.113.42",',
        '  "attempts": 5,',
        '  "ticket": "INC-4821"',
        '}',
      ].join('\n'),
    },
  },
  {
    clip: {
      id: 'demo-3',
      type: 'text',
      content: 'https://dashboard.example.com/incidents/INC-4821',
    },
  },
  {
    clip: {
      id: 'demo-4',
      type: 'text',
      content: 'Ticket INC-4821 — escalated to Tier 2 security review',
    },
    locked: true,
  },
  {
    clip: {
      id: 'demo-5',
      type: 'html',
      content: '<b>Quarterly access review</b> — 14 accounts flagged for MFA enforcement',
    },
  },
  {
    clip: {
      id: 'demo-6',
      type: 'text',
      content: 'Endpoint MAC 3c:22:fb:1a:9d:7e quarantined pending review',
    },
  },
  {
    clip: {
      id: 'demo-7',
      type: 'text',
      content: 'suspicious-domain.example.org resolves to 198.51.100.23',
    },
  },
  {
    clip: {
      id: 'demo-8',
      type: 'text',
      content: 'Customer order #100043912 refunded — case closed',
    },
  },
];

/** Quick Clips patterns (regex with named capture groups). */
export const SEARCH_TERMS: { name: string; pattern: string }[] = [
  { name: 'Email Address', pattern: '(?<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})' },
  { name: 'IPv4 Address', pattern: '(?<ip>(?:\\d{1,3}\\.){3}\\d{1,3})' },
  { name: 'Ticket ID', pattern: '(?<ticket>INC-\\d+)' },
  { name: 'MAC Address', pattern: '(?<mac>(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2})' },
];

/** Quick Tools — URL templates keyed off the capture groups above. */
export const QUICK_TOOLS: { name: string; url: string; captureGroups: string[] }[] = [
  {
    name: 'VirusTotal — IP',
    url: 'https://www.virustotal.com/gui/ip-address/{ip}',
    captureGroups: ['ip'],
  },
  { name: 'AbuseIPDB', url: 'https://www.abuseipdb.com/check/{ip}', captureGroups: ['ip'] },
  {
    name: 'Have I Been Pwned',
    url: 'https://haveibeenpwned.com/account/{email}',
    captureGroups: ['email'],
  },
  {
    name: 'Incident Dashboard',
    url: 'https://dashboard.example.com/incidents/{ticket}',
    captureGroups: ['ticket'],
  },
];

/** Templates — mix of named-token (matched) and positional (clip) templates. */
export const TEMPLATES: { name: string; content: string }[] = [
  {
    name: 'Incident Summary',
    content: 'Incident {ticket}: suspicious auth from {ip} targeting {email}. Investigating now.',
  },
  {
    name: 'Email Reply',
    content:
      "Hi — regarding {email}, we've reviewed the recent activity from {ip} and will follow up shortly.",
  },
  {
    name: 'Clip Digest',
    content: 'Latest: {c1}\nPrevious: {c2}',
  },
];

/**
 * The clip quick look opens on for the "patterns" screenshot. It is the newest
 * demo clip, so its IP, email, and ticket each match a search term above and
 * render as chips in the reader.
 */
export const QUICK_LOOK_CONTENT = DEMO_CLIPS[0].clip.content;

/** Filter string typed into the clip search bar for the "search" screenshot. */
export const SEARCH_FILTER = 'INC-4821';
