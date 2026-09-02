import { act, render } from '@testing-library/react';
import { vi } from 'vitest';
import type { QuickTool, SearchTerm, Template, UserSettings } from '../../../../../shared/types';
import { ToastProvider } from '../../Toast';
import { ScanIndexProvider } from '../../../providers/scan';
import { SettingsProvider } from '../general/SettingsProvider';
import { ToolsDataProvider } from './ToolsDataProvider';

/**
 * Test harness for the Tools tab: a fake Quick Clips config behind the mocked window.api,
 * with the config-changed broadcast wired so a write reloads the providers as the real
 * main process would.
 */

export const term = (id: string, name: string, pattern: string, enabled = true): SearchTerm => ({
  id,
  name,
  pattern,
  enabled,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
export const tool = (id: string, name: string, url: string): QuickTool => ({
  id,
  name,
  url,
  captureGroups: [],
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
export const template = (id: string, name: string, content: string): Template => ({
  id,
  name,
  content,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});

export const SAMPLE =
  'Investigating alert: failed logins from 203.0.113.42 for mreyes@example.com.\nSecond source 198.51.100.7. Tracking in INC-4821.';

export interface FakeConfig {
  terms: SearchTerm[];
  tools: QuickTool[];
  templates: Template[];
  groupColours: Record<string, number>;
}

export const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
export const flush = () => act(async () => {});

export function defaultConfig(): FakeConfig {
  return {
    terms: [
      term('t-ip', 'IP address', '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)'),
      term('t-email', 'Email address', '(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})'),
      term('t-ticket', 'Incident ticket', '(?<ticket>\\bINC-\\d{4,}\\b)'),
      term('t-domain', 'Domain name', '(?<domain>[a-z]+\\.example\\.org)', false),
    ],
    tools: [
      tool('o-vt', 'VirusTotal', 'https://www.virustotal.com/gui/ip-address/{ip}'),
      tool('o-scan', 'urlscan', 'https://urlscan.io/domain/{domain}'),
      tool('o-dir', 'Directory', 'https://people.example.com/search?q={user}'),
    ],
    templates: [
      template('p-sum', 'Incident Summary', 'Ticket {ticket}\nSource IP: {ip}\nAffected: {email}'),
      template('p-intake', 'Customer intake', 'Customer: {c1}\nCallback: {c2}'),
    ],
    groupColours: {},
  };
}

let listener: (() => void) | null = null;
let seq = 100;

/** What the main process does after any config write: tell every window. */
export function fireConfigChanged(): void {
  listener?.();
}

/**
 * Point the mocked api at a config. Writes mutate it and fire the broadcast.
 */
export function installConfig(
  config: FakeConfig,
  settings: Partial<UserSettings> = {}
): FakeConfig {
  const a = api();
  a.storageGetSettings.mockResolvedValue({
    maxClips: 100,
    startMinimized: false,
    autoStart: false,
    ...settings,
  });
  a.settingsChanged.mockResolvedValue({ ok: true, failed: [] });
  a.storageGetClipsSnapshot.mockResolvedValue({
    loadState: { complete: true, error: null, recoverable: false },
    clips: [
      {
        clip: { id: 'c1', type: 'text', content: 'newest clip text with 10.0.0.1' },
        isLocked: false,
        timestamp: 1,
      },
    ],
  });
  a.searchTermsGetAll.mockImplementation(async () => [...config.terms]);
  a.quickToolsGetAll.mockImplementation(async () => [...config.tools]);
  a.templatesGetAll.mockImplementation(async () => [...config.templates]);
  a.groupColoursGet.mockImplementation(async () => ({ ...config.groupColours }));
  a.onQuickClipsConfigChanged.mockImplementation((cb: () => void) => {
    listener = cb;
    return () => {
      listener = null;
    };
  });
  const changed = () => listener?.();
  a.searchTermsCreate.mockImplementation(async (name: string, pattern: string) => {
    const created = term(`t-${seq++}`, name, pattern);
    config.terms.push(created);
    changed();
    return created;
  });
  a.searchTermsUpdate.mockImplementation(async (id: string, updates: Partial<SearchTerm>) => {
    const at = config.terms.findIndex((t) => t.id === id);
    config.terms[at] = { ...config.terms[at], ...updates };
    changed();
    return config.terms[at];
  });
  a.searchTermsDelete.mockImplementation(async (id: string) => {
    config.terms = config.terms.filter((t) => t.id !== id);
    changed();
  });
  a.quickToolsCreate.mockImplementation(async (name: string, url: string) => {
    const created = tool(`o-${seq++}`, name, url);
    config.tools.push(created);
    changed();
    return created;
  });
  a.quickToolsUpdate.mockImplementation(async (id: string, updates: Partial<QuickTool>) => {
    const at = config.tools.findIndex((t) => t.id === id);
    config.tools[at] = { ...config.tools[at], ...updates };
    changed();
    return config.tools[at];
  });
  a.quickToolsDelete.mockImplementation(async (id: string) => {
    config.tools = config.tools.filter((t) => t.id !== id);
    changed();
  });
  a.templatesCreate.mockImplementation(async (name: string, content: string) => {
    const created = template(`p-${seq++}`, name, content);
    config.templates.push(created);
    changed();
    return created;
  });
  a.templatesUpdate.mockImplementation(async (id: string, updates: Partial<Template>) => {
    const at = config.templates.findIndex((t) => t.id === id);
    config.templates[at] = { ...config.templates[at], ...updates };
    changed();
    return config.templates[at];
  });
  a.templatesDelete.mockImplementation(async (id: string) => {
    config.templates = config.templates.filter((t) => t.id !== id);
    changed();
  });
  a.groupColoursSet.mockImplementation(async (colours: Record<string, number>) => {
    config.groupColours = { ...colours };
    changed();
    return config.groupColours;
  });
  a.quickClipsImportConfig.mockImplementation(async () => {
    changed();
  });
  return config;
}

export async function renderTools(ui: React.ReactNode) {
  const result = render(
    <ToastProvider>
      <SettingsProvider>
        <ScanIndexProvider>
          <ToolsDataProvider>{ui}</ToolsDataProvider>
        </ScanIndexProvider>
      </SettingsProvider>
    </ToastProvider>
  );
  await flush();
  await flush();
  return result;
}
