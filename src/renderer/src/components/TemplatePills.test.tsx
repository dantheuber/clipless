import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ScanResult, Template } from '../../../shared/types';
import { TemplatePills, useTemplatePills, usedValues } from './TemplatePills';

const { state } = vi.hoisted(() => ({
  state: {
    templates: [] as Template[],
    pinsByGroup: {} as Record<string, string[]>,
    setPins: vi.fn(),
    toast: vi.fn(),
    clips: [
      { id: 'a', type: 'text', content: 'row one' },
      { id: 'b', type: 'text', content: 'row two' },
    ],
  },
}));

vi.mock('../providers/scan', () => ({
  useScanIndex: () => ({ templates: state.templates }),
}));

vi.mock('../providers/clips', () => ({
  useClipsPins: () => ({ pinsByGroup: state.pinsByGroup, setPins: state.setPins }),
  useClipsData: () => ({ clips: state.clips }),
  clipText: (clip: { content: string }) => clip.content,
}));

vi.mock('./Toast', () => ({
  useToast: () => state.toast,
}));

const template = (id: string, name: string, content: string): Template => ({
  id,
  name,
  content,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});

const scan = (matches: [string, string][]): ScanResult => ({
  matches: matches.map(([group, value], i) => ({
    group,
    value,
    start: i * 20,
    end: i * 20 + value.length,
    termId: 't',
  })),
  groups: [...new Set(matches.map(([g]) => g))],
  errors: [],
  large: false,
});

beforeEach(() => {
  state.templates = [
    template('t1', 'Incident summary', 'Ticket {ticket} from {ip} by {email}'),
    template('t2', 'IP block', 'Block {ip} now, see {c1}'),
    template('t3', 'Standup', 'Yesterday {c1}, today {c2}'),
  ];
  state.pinsByGroup = {};
  state.setPins.mockClear();
  state.toast.mockClear();
  const api = window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
  api.setClipboardText.mockClear();
  api.setClipboardText.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('TemplatePills', () => {
  it('lists match-driven templates only, with the missing tokens named', () => {
    render(<TemplatePills />);
    expect(screen.getByText('Incident summary')).toBeInTheDocument();
    expect(screen.getByText('IP block')).toBeInTheDocument();
    expect(screen.queryByText('Standup')).toBeNull();
    expect(screen.getByText('needs ticket + ip + email')).toBeInTheDocument();
    expect(screen.getByText('needs ip')).toBeInTheDocument();
  });

  it('renders nothing when no template has named tokens', () => {
    state.templates = [template('t3', 'Standup', '{c1}')];
    const { container } = render(<TemplatePills />);
    expect(container.innerHTML).toBe('');
  });

  it('a ready pill generates the text, copies it and toasts the values used', async () => {
    state.pinsByGroup = { ip: ['1.1.1.1', '2.2.2.2'] };
    render(<TemplatePills />);
    const pill = screen.getByText('IP block').closest('button') as HTMLButtonElement;
    expect(pill.dataset.state).toBe('ready');
    expect(pill.title).toBe('Copy "IP block" using ip 1.1.1.1 (first of 2)');
    await act(async () => {
      fireEvent.click(pill);
    });
    expect(window.api.setClipboardText).toHaveBeenCalledWith('Block 1.1.1.1 now, see row one');
    expect(state.toast).toHaveBeenCalledWith('Copied "IP block" to the clipboard (30 chars)', [
      'ip 1.1.1.1 (first of 2)',
    ]);
  });

  it('toasts the failure when the clipboard write rejects', async () => {
    const api = window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
    api.setClipboardText.mockRejectedValue(new Error('nope'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.pinsByGroup = { ip: ['1.1.1.1'] };
    render(<TemplatePills />);
    await act(async () => {
      fireEvent.click(screen.getByText('IP block'));
    });
    expect(state.toast).toHaveBeenCalledWith('Could not copy "IP block"', 'Error: nope');
    errSpy.mockRestore();
  });

  it('a not-ready pill pins the missing values from the open clip and toasts', () => {
    state.pinsByGroup = { ticket: ['INC-1'] };
    render(
      <TemplatePills
        openClipScan={scan([
          ['ip', '9.9.9.9'],
          ['email', 'x@y.z'],
          ['ip', '8.8.8.8'],
        ])}
      />
    );
    const pill = screen.getByText('Incident summary').closest('button') as HTMLButtonElement;
    expect(pill.dataset.state).toBe('needs');
    expect(pill.title).toBe('Click to pin ip 9.9.9.9, email x@y.z from this clip');
    fireEvent.click(pill);
    expect(state.setPins).toHaveBeenCalledWith(['ip|9.9.9.9', 'email|x@y.z'], true);
    expect(state.toast).toHaveBeenCalledWith(
      'Pinned 9.9.9.9, x@y.z for "Incident summary"',
      'Click the template again to copy it.'
    );
  });

  it('a pill the open clip cannot satisfy is inert and its tooltip names only what the clip lacks', () => {
    state.pinsByGroup = { ip: ['1.1.1.1'] };
    render(<TemplatePills openClipScan={scan([['email', 'x@y.z']])} />);
    const pill = screen.getByText('Incident summary').closest('button') as HTMLButtonElement;
    expect(pill.dataset.state).toBe('inert');
    expect(pill).toHaveAttribute('aria-disabled', 'true');
    expect(pill.title).toBe(
      'Needs ticket and email. ticket is not in this clip; pin it from another clip.'
    );
    fireEvent.click(pill);
    expect(state.setPins).not.toHaveBeenCalled();
    expect(state.toast).not.toHaveBeenCalled();
  });

  it('pluralises the inert tooltip and words it for the tray when there is no open clip', () => {
    render(<TemplatePills openClipScan={scan([])} />);
    expect(
      (screen.getByText('Incident summary').closest('button') as HTMLButtonElement).title
    ).toBe(
      'Needs ticket, ip and email. ticket, ip and email are not in this clip; pin them from another clip.'
    );
    cleanup();
    render(<TemplatePills />);
    expect((screen.getByText('IP block').closest('button') as HTMLButtonElement).title).toBe(
      'Needs ip. Pin it from a clip.'
    );
    expect(
      (screen.getByText('Incident summary').closest('button') as HTMLButtonElement).title
    ).toBe('Needs ticket, ip and email. Pin them from a clip.');
  });

  it('readyOnly hides not-ready pills and showLabel false drops the label', () => {
    state.pinsByGroup = { ip: ['1.1.1.1'] };
    render(<TemplatePills readyOnly showLabel={false} />);
    expect(screen.getByText('IP block')).toBeInTheDocument();
    expect(screen.queryByText('Incident summary')).toBeNull();
    expect(screen.queryByText('Templates')).toBeNull();
  });
});

describe('useTemplatePills', () => {
  function Probe() {
    const { copyFirstReady } = useTemplatePills();
    return <button onClick={copyFirstReady}>t</button>;
  }

  it('copyFirstReady copies the first ready template, or toasts what to do', async () => {
    render(<Probe />);
    fireEvent.click(screen.getByText('t'));
    expect(state.toast).toHaveBeenCalledWith(
      'No template is ready',
      'Pin the values a template needs; the footer shows which.'
    );
    cleanup();
    state.toast.mockClear();
    state.pinsByGroup = { ip: ['1.1.1.1'] };
    render(<Probe />);
    await act(async () => {
      fireEvent.click(screen.getByText('t'));
    });
    expect(window.api.setClipboardText).toHaveBeenCalledWith('Block 1.1.1.1 now, see row one');
  });

  it('usedValues says first of N only beyond one pin', () => {
    expect(
      usedValues({ kind: 'ready', values: { ip: '1', email: 'e' }, counts: { ip: 3, email: 1 } })
    ).toEqual(['ip 1 (first of 3)', 'email e']);
  });
});
