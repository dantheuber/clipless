import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { Tray, openTabs, tabCount } from './Tray';

const { state } = vi.hoisted(() => ({
  state: {
    pins: new Map<string, unknown>(),
    pinsByGroup: {} as Record<string, string[]>,
    setPins: vi.fn(),
    clearPins: vi.fn(),
    droppedNotice: null as string | null,
    dismissDroppedNotice: vi.fn(),
    tools: [] as { id: string; name: string; url: string }[],
    templates: [] as unknown[],
    toast: vi.fn(),
    short: false,
    narrow: false,
  },
}));

vi.mock('../../providers/clips', () => ({
  useClipsPins: () => ({
    pins: state.pins,
    pinsByGroup: state.pinsByGroup,
    setPins: state.setPins,
    clearPins: state.clearPins,
    droppedNotice: state.droppedNotice,
    dismissDroppedNotice: state.dismissDroppedNotice,
  }),
  useClipsData: () => ({ clips: [] }),
  clipText: () => '',
}));

vi.mock('../../providers/scan', () => ({
  useScanIndex: () => ({ tools: state.tools, templates: state.templates, slotFor: () => 0 }),
}));

vi.mock('../Toast', () => ({
  useToast: () => state.toast,
}));

vi.mock('../../hooks/useMediaQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useMediaQuery')>();
  return {
    ...actual,
    useMediaQuery: (query: string) => (query === actual.SHORT_WINDOW ? state.short : state.narrow),
  };
});

const pin = (group: string, value: string) =>
  [`${group}|${value}`, { group, value, pinnedAt: 0 }] as const;

beforeEach(() => {
  vi.clearAllMocks();
  state.pins = new Map([pin('ip', '1.1.1.1'), pin('ip', '2.2.2.2'), pin('ticket', 'INC-1')]);
  state.pinsByGroup = { ip: ['1.1.1.1', '2.2.2.2'], ticket: ['INC-1'] };
  state.tools = [
    { id: 'vt', name: 'VirusTotal', url: 'https://vt.example/{ip}' },
    { id: 'sn', name: 'ServiceNow', url: 'https://sn.example/{ticket}' },
  ];
  state.droppedNotice = null;
  state.short = false;
  state.narrow = false;
  (window.api.openExternalUrls as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(3);
});

afterEach(cleanup);

describe('Tray', () => {
  it('is hidden with nothing pinned and no notice', () => {
    state.pins = new Map();
    state.pinsByGroup = {};
    const { container } = render(<Tray />);
    expect(container.innerHTML).toBe('');
  });

  it('shows one row per group with values, multipliers and the exact tab count', () => {
    render(<Tray />);
    expect(screen.getByText('Launch tray')).toBeInTheDocument();
    expect(screen.getByText('3 values')).toBeInTheDocument();
    expect(screen.getByTestId('tray-group-ip')).toHaveTextContent('ip x2');
    expect(screen.getByTestId('tray-group-ip')).toHaveTextContent('VirusTotal x2');
    expect(screen.getByTestId('tray-group-ticket')).toHaveTextContent('ServiceNow');
    expect(screen.getByTestId('tray-group-ticket')).not.toHaveTextContent('x1');
    expect(screen.getByTestId('open-all')).toHaveTextContent('Open all (3 tabs)');
  });

  it('a tool button opens its urls and toasts the count; Open all opens every url', async () => {
    render(<Tray />);
    await act(async () => {
      fireEvent.click(screen.getByText('VirusTotal x2'));
    });
    expect(window.api.openExternalUrls).toHaveBeenCalledWith([
      'https://vt.example/1.1.1.1',
      'https://vt.example/2.2.2.2',
    ]);
    expect(state.toast).toHaveBeenCalledWith('Opened 3 tabs', expect.any(Array));
    await act(async () => {
      fireEvent.click(screen.getByTestId('open-all'));
    });
    expect(window.api.openExternalUrls).toHaveBeenLastCalledWith([
      'https://vt.example/1.1.1.1',
      'https://vt.example/2.2.2.2',
      'https://sn.example/INC-1',
    ]);
  });

  it('removes a value, clears everything, and dismisses the dropped notice', () => {
    state.droppedNotice = 'Dropped 9.9.9.9 (ip) after the edit';
    render(<Tray />);
    fireEvent.click(screen.getByLabelText('Unpin 2.2.2.2'));
    expect(state.setPins).toHaveBeenCalledWith(['ip|2.2.2.2'], false);
    fireEvent.click(screen.getByTestId('tray-clear'));
    expect(state.clearPins).toHaveBeenCalled();
    expect(screen.getByTestId('tray-notice')).toHaveTextContent(
      'Dropped 9.9.9.9 (ip) after the edit'
    );
    fireEvent.click(screen.getByText('dismiss'));
    expect(state.dismissDroppedNotice).toHaveBeenCalled();
  });

  it('shows the notice alone after the last pin is dropped', () => {
    state.pins = new Map();
    state.pinsByGroup = {};
    state.droppedNotice = 'Dropped 1.1.1.1 (ip) rotated out of the list';
    render(<Tray />);
    expect(screen.getByTestId('tray-notice')).toBeInTheDocument();
    expect(screen.queryByText('Launch tray')).toBeNull();
  });

  it('opens collapsed to one line in a short window, with the count, and expands on click', () => {
    state.short = true;
    render(<Tray />);
    expect(screen.getByText('3 values: ip x2, ticket')).toBeInTheDocument();
    expect(screen.getByTestId('open-all')).toHaveTextContent('Open all (3 tabs)');
    expect(screen.queryByTestId('tray-group-ip')).toBeNull();
    fireEvent.click(screen.getByText('expand'));
    expect(screen.getByTestId('tray-group-ip')).toBeInTheDocument();
    fireEvent.click(screen.getByText('collapse'));
    expect(screen.queryByTestId('tray-group-ip')).toBeNull();
  });

  it('offers collapse in a narrow window and shortens long values', () => {
    state.narrow = true;
    const long = 'https://example.com/a/very/long/url/that/keeps/going/and/going';
    state.pins = new Map([pin('url', long)]);
    state.pinsByGroup = { url: [long] };
    render(<Tray />);
    fireEvent.click(screen.getByText('expand'));
    expect(screen.getByTitle(long)).toHaveTextContent('…');
    expect(screen.getByText('collapse')).toBeInTheDocument();
    expect(screen.getByTestId('open-all')).toBeDisabled();
  });

  it('a single value reads "1 value"', () => {
    state.pins = new Map([pin('ip', '1.1.1.1')]);
    state.pinsByGroup = { ip: ['1.1.1.1'] };
    render(<Tray />);
    expect(screen.getByText('1 value')).toBeInTheDocument();
    expect(screen.getByTestId('open-all')).toHaveTextContent('Open all (1 tab)');
  });
});

describe('openTabs', () => {
  it('does nothing for no urls and toasts a failure', async () => {
    const toast = vi.fn();
    await openTabs([], toast);
    expect(window.api.openExternalUrls).not.toHaveBeenCalled();
    (window.api.openExternalUrls as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('no')
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await openTabs(['https://x'], toast);
    expect(toast).toHaveBeenCalledWith('Could not open the tabs', 'Error: no');
    errSpy.mockRestore();
  });

  it('names the cause when fewer tabs opened than were offered', async () => {
    const toast = vi.fn();
    const mock = window.api.openExternalUrls as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(2);
    await openTabs(['https://a', 'example.com/b', 'https://c'], toast);
    expect(toast).toHaveBeenCalledWith('Opened 2 of 3 tabs; only http and https links can open', [
      'https://a',
      'example.com/b',
      'https://c',
    ]);
    mock.mockResolvedValue(0);
    await openTabs(['example.com/b'], toast);
    expect(toast).toHaveBeenLastCalledWith(
      'Opened 0 of 1 tab; only http and https links can open',
      ['example.com/b']
    );
    mock.mockResolvedValue(1);
    await openTabs(['https://a'], toast);
    expect(toast).toHaveBeenLastCalledWith('Opened 1 tab', ['https://a']);
  });

  it('tabCount pluralises', () => {
    expect(tabCount(1)).toBe('1 tab');
    expect(tabCount(0)).toBe('0 tabs');
  });
});
