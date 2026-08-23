import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ClipContextMenu, ROW_ONE_REASON, templatePreview } from './ClipContextMenu';

const { state } = vi.hoisted(() => ({
  state: {
    clips: [
      { id: 'a', type: 'text', content: 'row one text' },
      { id: 'b', type: 'text', content: 'row two' },
      { id: 'c', type: 'text', content: 'row three' },
      { id: 'd', type: 'text', content: '' },
    ],
    locked: new Set<number>(),
    toggleClipLock: vi.fn(),
    emptyClip: vi.fn(),
    copyClipToClipboard: vi.fn().mockResolvedValue(undefined),
    openQuickLook: vi.fn(),
    templates: [] as { id: string; name: string; content: string }[],
    toast: vi.fn(),
  },
}));

vi.mock('../../../providers/clips', () => ({
  useClipsActions: () => ({
    isClipLocked: (i: number) => state.locked.has(i),
    toggleClipLock: state.toggleClipLock,
    emptyClip: state.emptyClip,
    getClip: (i: number) => state.clips[i],
    copyClipToClipboard: state.copyClipToClipboard,
  }),
  useClipsData: () => ({ clips: state.clips }),
  useQuickLook: () => ({ openQuickLook: state.openQuickLook }),
  clipText: (clip: { content: string }) => clip.content,
}));

vi.mock('../../../providers/clips/quickLook', () => ({
  hasContent: (clip: { content: string }) => clip.content.trim().length > 0,
}));

vi.mock('../../../providers/scan', () => ({
  useScanIndex: () => ({ templates: state.templates }),
}));

vi.mock('../../Toast', () => ({
  useToast: () => state.toast,
}));

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  state.locked = new Set();
  state.templates = [
    { id: 't1', name: 'Standup', content: 'Yesterday: {c1}\nToday: {c2}' },
    { id: 't2', name: 'Match driven', content: 'ip {ip}' },
    { id: 't3', name: 'Static', content: 'no tokens' },
  ];
  api().setClipboardText.mockResolvedValue(undefined);
});

afterEach(cleanup);

const open = (index: number, onClose = vi.fn()) => {
  render(<ClipContextMenu index={index} x={10} y={10} onClose={onClose} />);
  return onClose;
};

describe('ClipContextMenu', () => {
  it('row 2 offers every item enabled and Quick look opens the reader', () => {
    const onClose = open(1);
    for (const id of ['menu-copy', 'menu-quick-look', 'menu-lock', 'menu-delete']) {
      expect(screen.getByTestId(id)).not.toHaveAttribute('aria-disabled');
    }
    fireEvent.click(screen.getByTestId('menu-quick-look'));
    expect(state.openQuickLook).toHaveBeenCalledWith('b', 1);
    expect(onClose).toHaveBeenCalled();
  });

  it('row 1 disables Lock and Delete with the reason, and their handlers never fire', () => {
    open(0);
    const lock = screen.getByTestId('menu-lock');
    const del = screen.getByTestId('menu-delete');
    expect(lock).toHaveAttribute('aria-disabled', 'true');
    expect(del).toHaveAttribute('aria-disabled', 'true');
    expect(lock).toHaveTextContent(ROW_ONE_REASON);
    expect(del).toHaveTextContent(ROW_ONE_REASON);
    fireEvent.click(lock);
    fireEvent.click(del);
    expect(state.toggleClipLock).not.toHaveBeenCalled();
    expect(state.emptyClip).not.toHaveBeenCalled();
    // quick look and copy still work on row 1
    expect(screen.getByTestId('menu-quick-look')).not.toHaveAttribute('aria-disabled');
  });

  it('an empty row disables Copy, Quick look, Lock and Delete without the row 1 reason', () => {
    open(3);
    for (const id of ['menu-copy', 'menu-quick-look', 'menu-lock', 'menu-delete']) {
      expect(screen.getByTestId(id)).toHaveAttribute('aria-disabled', 'true');
    }
    expect(screen.queryByText(ROW_ONE_REASON)).toBeNull();
  });

  it('copies, locks and deletes from the items', async () => {
    open(2);
    await act(async () => {
      fireEvent.click(screen.getByTestId('menu-copy'));
    });
    expect(state.copyClipToClipboard).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByTestId('menu-lock'));
    expect(state.toggleClipLock).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByTestId('menu-delete'));
    expect(state.emptyClip).toHaveBeenCalledWith(2);
  });

  it('says Unlock for a locked row', () => {
    state.locked = new Set([2]);
    open(2);
    expect(screen.getByTestId('menu-unlock')).toBeInTheDocument();
  });

  it('the submenu lists positional templates with previews from rows 1 to 3, on every row', () => {
    open(2);
    const parent = screen.getByTestId('menu-fill-clip-template');
    expect(parent).not.toHaveAttribute('aria-disabled');
    fireEvent.mouseEnter(parent);
    const submenu = screen.getByTestId('clip-template-submenu');
    expect(submenu).toHaveTextContent('Standup');
    expect(submenu).toHaveTextContent('Yesterday: row one text Today: row two');
    expect(submenu).toHaveTextContent('Static');
    expect(submenu).not.toHaveTextContent('Match driven');
    fireEvent.mouseLeave(parent);
    expect(screen.queryByTestId('clip-template-submenu')).toBeNull();
    fireEvent.click(parent);
    expect(screen.getByTestId('clip-template-submenu')).toBeInTheDocument();
  });

  it('a submenu item copies the filled template and toasts', async () => {
    const onClose = open(1);
    fireEvent.mouseEnter(screen.getByTestId('menu-fill-clip-template'));
    await act(async () => {
      fireEvent.click(screen.getByText('Standup'));
    });
    expect(window.api.setClipboardText).toHaveBeenCalledWith(
      'Yesterday: row one text\nToday: row two'
    );
    expect(state.toast).toHaveBeenCalledWith('Copied "Standup" to the clipboard (38 chars)', [
      'Yesterday: row one text',
      'Today: row two',
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('toasts when the template copy fails', async () => {
    api().setClipboardText.mockRejectedValueOnce(new Error('no'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    open(1);
    fireEvent.mouseEnter(screen.getByTestId('menu-fill-clip-template'));
    await act(async () => {
      fireEvent.click(screen.getByText('Static'));
    });
    expect(state.toast).toHaveBeenCalledWith('Could not copy "Static"', 'Error: no');
    errSpy.mockRestore();
  });

  it('shows the submenu disabled with "no clip templates" when none exist', () => {
    state.templates = [{ id: 't2', name: 'Match driven', content: 'ip {ip}' }];
    open(1);
    const parent = screen.getByTestId('menu-fill-clip-template');
    expect(parent).toHaveAttribute('aria-disabled', 'true');
    expect(parent).toHaveTextContent('no clip templates');
    fireEvent.click(parent);
    fireEvent.mouseEnter(parent);
    expect(screen.queryByTestId('clip-template-submenu')).toBeNull();
  });

  it('closes on Escape and on a click outside, not on a click inside', () => {
    const onClose = open(1);
    fireEvent.click(screen.getByTestId('clip-context-menu'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps the menu inside the viewport', () => {
    const menu = render(<ClipContextMenu index={1} x={5000} y={5000} onClose={vi.fn()} />);
    const element = menu.getByTestId('clip-context-menu');
    expect(parseInt(element.style.left)).toBeLessThan(5000);
    expect(parseInt(element.style.top)).toBeLessThan(5000);
  });

  it('templatePreview collapses whitespace and trims to one line', () => {
    expect(templatePreview('a\n\n  b')).toBe('a b');
    expect(templatePreview('x'.repeat(60))).toBe('x'.repeat(46) + '…');
  });
});
