import type { ClipItem } from '../../src/shared/types';

export interface DemoClip {
  clip: ClipItem;
  locked?: boolean; // index 0 can never be locked
}

export const DEMO_CLIPS: DemoClip[] = [
  // most-recent-first (index 0 is the live clipboard entry); all values fictional (example.com / RFC 5737 ranges)
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

export const SEARCH_TERMS: { name: string; pattern: string }[] = [
  { name: 'Email Address', pattern: '(?<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})' },
  { name: 'IPv4 Address', pattern: '(?<ip>(?:\\d{1,3}\\.){3}\\d{1,3})' },
  { name: 'Ticket ID', pattern: '(?<ticket>INC-\\d+)' },
  { name: 'MAC Address', pattern: '(?<mac>(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2})' },
];

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

export const QUICK_LOOK_CONTENT = DEMO_CLIPS[0].clip.content; // newest clip: its ip, email and ticket each match a search term above

export const SEARCH_FILTER = 'INC-4821';
