import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import Settings from './Settings';
import { defaultConfig, installConfig } from './components/settings/tools/harness';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const flush = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  installConfig(defaultConfig());
  api().storageGetStats.mockResolvedValue({ clipCount: 0, lockedCount: 0, dataSize: 0 });
  window.history.replaceState({}, '', '/');
});

afterEach(cleanup);

describe('Settings window', () => {
  it.each([
    {
      kind: 'tool',
      row: 'row-tool-o-vt',
      field: 'tool-url',
      value: 'https://example.com/{ip}',
      original: 'https://www.virustotal.com/gui/ip-address/{ip}',
      destination: 'general',
    },
    {
      kind: 'template',
      row: 'row-template-p-sum',
      field: 'template-text',
      value: 'Changed {ip}',
      original: 'Ticket {ticket}\nSource IP: {ip}\nAffected: {email}',
      destination: 'hotkeys',
    },
    {
      kind: 'search term',
      row: 'row-term-t-ticket',
      field: 'term-pattern',
      value: '(?<ticket>INC-\\d+)',
      original: '(?<ticket>\\bINC-\\d{4,}\\b)',
      destination: 'general',
    },
  ])(
    'keeps dirty $kind edits until switching to $destination is confirmed',
    async ({ row, field, value, original, destination }) => {
      window.history.replaceState({}, '', '/?tab=tools');
      render(<Settings />);
      await flush();
      fireEvent.click(screen.getByTestId(row));
      fireEvent.change(screen.getByTestId(field), { target: { value } });

      fireEvent.click(screen.getByTestId('rail-tools'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByTestId(field)).toHaveValue(value);

      fireEvent.click(screen.getByTestId(`rail-${destination}`));
      const dialog = screen.getByRole('dialog', { name: 'Discard changes?' });
      expect(screen.getByTestId('rail-tools')).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByTestId('panel-application')).toBeNull();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByTestId(field)).toHaveValue(value);

      fireEvent.click(screen.getByTestId(`rail-${destination}`));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }));
      await flush();
      expect(screen.getByTestId(`rail-${destination}`)).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByTestId('list-pane')).toBeNull();
      expect(api().quickToolsUpdate).not.toHaveBeenCalled();
      expect(api().templatesUpdate).not.toHaveBeenCalled();
      expect(api().searchTermsUpdate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('rail-tools'));
      await flush();
      fireEvent.click(screen.getByTestId(row));
      expect(screen.getByTestId(field)).toHaveValue(original);
    }
  );

  it('switches away from a clean Tools editor immediately', async () => {
    window.history.replaceState({}, '', '/?tab=tools');
    render(<Settings />);
    await flush();
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    fireEvent.click(screen.getByTestId('rail-general'));
    await flush();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('panel-application')).toBeInTheDocument();
  });

  it.each(['save', 'cancel', 'revert'])(
    'allows rail navigation after dirty Tools edits are cleared by %s',
    async (action) => {
      window.history.replaceState({}, '', '/?tab=tools');
      render(<Settings />);
      await flush();
      fireEvent.click(screen.getByTestId('row-tool-o-vt'));
      const url = screen.getByTestId('tool-url');
      const original = (url as HTMLInputElement).value;
      fireEvent.change(url, { target: { value: 'https://example.com/{ip}' } });
      if (action === 'revert') fireEvent.change(url, { target: { value: original } });
      else fireEvent.click(screen.getByTestId(`tool-${action}`));
      await flush();

      fireEvent.click(screen.getByTestId('rail-hotkeys'));
      await flush();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByTestId('hotkeys-table')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('rail-general'));
      await flush();
      expect(screen.getByTestId('panel-application')).toBeInTheDocument();
    }
  );

  it('shows one loading state, then General, and switches tabs from the rail', async () => {
    let resolve: (v: unknown) => void = () => {};
    api().storageGetSettings.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    render(<Settings />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    await act(async () => resolve({ maxClips: 100, startMinimized: false, autoStart: false }));
    expect(screen.getByTestId('panel-application')).toBeInTheDocument();
    expect(screen.getByTestId('rail-version')).toHaveTextContent('v0.0.0-test');

    fireEvent.click(screen.getByTestId('rail-hotkeys'));
    await flush();
    expect(screen.getByTestId('hotkeys-table')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rail-tools'));
    await flush();
    expect(screen.getByTestId('list-pane')).toBeInTheDocument();
  });

  it('opens on the tab named in the URL, mapping the old names', async () => {
    window.history.replaceState({}, '', '/?tab=templates');
    render(<Settings />);
    await flush();
    expect(screen.getByTestId('rail-tools')).toHaveAttribute('aria-current', 'page');
  });

  it('shows a load failure inline with a retry link', async () => {
    api().storageGetSettings.mockRejectedValueOnce(new Error('no disk'));
    render(<Settings />);
    await flush();
    expect(screen.getByTestId('load-error')).toHaveTextContent('no disk');
    fireEvent.click(screen.getByText('retry'));
    await flush();
    expect(screen.getByTestId('panel-application')).toBeInTheDocument();
  });
});
