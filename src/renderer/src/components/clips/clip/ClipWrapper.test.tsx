import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ClipItem, ScanResult } from '../../../../../shared/types';
import { ClipWrapper } from './ClipWrapper';

const { state } = vi.hoisted(() => ({
  state: {
    openClipId: null as string | null,
    locked: new Set<number>(),
    openQuickLook: vi.fn(),
    togglePins: vi.fn(),
    copyClipToClipboard: vi.fn().mockResolvedValue(undefined),
    updateClip: vi.fn(),
    pendingScan: false,
  },
}));

const ipScan = (text: string): ScanResult => {
  const matches = [...text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)].map((m) => ({
    group: 'ip',
    value: m[0],
    start: m.index as number,
    end: (m.index as number) + m[0].length,
    termId: 't',
  }));
  return { matches, groups: matches.length ? ['ip'] : [], errors: [], large: false };
};

vi.mock('../../../providers/clips', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../providers/clips')>();
  return {
    clipText: actual.clipText,
    useClipsActions: () => ({
      copyClipToClipboard: state.copyClipToClipboard,
      updateClip: state.updateClip,
      isClipLocked: (i: number) => state.locked.has(i),
    }),
    useClipsPins: () => ({ isPinned: () => false, togglePins: state.togglePins }),
    useQuickLook: () => ({
      quickLook: { openClipId: state.openClipId },
      openQuickLook: state.openQuickLook,
    }),
  };
});

vi.mock('../../../providers/scan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../providers/scan')>();
  return {
    EMPTY_SCAN: actual.EMPTY_SCAN,
    useScanIndex: () => ({
      getScan: (clip: ClipItem) => (state.pendingScan ? null : ipScan(clip.text ?? clip.content)),
      slotFor: () => 3,
    }),
  };
});

vi.mock('../../../providers/languageDetection', () => ({
  useLanguageDetection: () => ({ isCodeDetectionEnabled: false }),
}));

vi.mock('./ClipContextMenu', () => ({
  ClipContextMenu: ({ index, onClose }: { index: number; onClose: () => void }) => (
    <div data-testid="menu" onClick={onClose}>
      menu for {index}
    </div>
  ),
}));

const text: ClipItem = { id: 'a', type: 'text', content: 'host 1.1.1.1' };
const html: ClipItem = { id: 'h', type: 'html', content: '<p>x</p>', text: 'x 2.2.2.2' };
const image: ClipItem = { id: 'i', type: 'image', content: 'data:image/png;base64,x' };
const empty: ClipItem = { id: 'e', type: 'text', content: '' };

const row = (
  clip: ClipItem,
  index = 1,
  extra: Partial<React.ComponentProps<typeof ClipWrapper>> = {}
) =>
  render(
    <ClipWrapper
      clip={clip}
      index={index}
      visibleIndex={index}
      isCurrentCopiedClip={false}
      {...extra}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.openClipId = null;
  state.locked = new Set();
  state.pendingScan = false;
});

afterEach(cleanup);

describe('ClipWrapper', () => {
  it('shows the number, one dot per group, the eye, and no lock by default', () => {
    row(text);
    expect(screen.getByTestId('row-number')).toHaveTextContent('2');
    const dots = screen.getByTestId('group-dots').querySelectorAll('i');
    expect(dots).toHaveLength(1);
    expect((dots[0] as HTMLElement).style.getPropertyValue('--gc')).toBe('var(--slot-3)');
    expect(screen.getByTestId('eye')).toBeInTheDocument();
    expect(screen.queryByTestId('lock-glyph')).toBeNull();
  });

  it('shows the lock glyph and the copied marker', () => {
    state.locked = new Set([1]);
    row(text, 1, { isCurrentCopiedClip: true });
    expect(screen.getByTestId('lock-glyph')).toBeInTheDocument();
    expect(screen.getByTestId('row-number')).not.toHaveTextContent('2');
  });

  it('an empty row has no dots and no eye and Space does nothing', () => {
    row(empty);
    expect(screen.queryByTestId('group-dots')).toBeNull();
    expect(screen.queryByTestId('eye')).toBeNull();
    fireEvent.keyDown(screen.getByTestId('clip-row'), { key: ' ' });
    expect(state.openQuickLook).not.toHaveBeenCalled();
  });

  it('the eye opens quick look and lights while its clip is open', () => {
    row(text);
    fireEvent.click(screen.getByTestId('eye'));
    expect(state.openQuickLook).toHaveBeenCalledWith('a', 1);
    expect(screen.getByTestId('eye').className).not.toContain('eyeOn');
    cleanup();
    state.openClipId = 'a';
    row(text);
    expect(screen.getByTestId('eye').className).toContain('eyeOn');
    expect(screen.getByTestId('clip-row').className).toContain('selected');
  });

  it('Space opens quick look, p pins every chip, Enter edits a text row', () => {
    row(text);
    const r = screen.getByTestId('clip-row');
    fireEvent.keyDown(r, { key: ' ' });
    expect(state.openQuickLook).toHaveBeenCalledWith('a', 1);
    fireEvent.keyDown(r, { key: 'p' });
    expect(state.togglePins).toHaveBeenCalledWith(['ip|1.1.1.1']);
    fireEvent.keyDown(r, { key: 'p', ctrlKey: true });
    expect(state.togglePins).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(r, { key: 'Enter' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    // keys from the editor are the editor's own
    fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' });
    expect(state.openQuickLook).toHaveBeenCalledTimes(1);
  });

  it('Enter on a non-text row opens the reader; p without chips does nothing', () => {
    row(image);
    const r = screen.getByTestId('clip-row');
    fireEvent.keyDown(r, { key: 'Enter' });
    expect(state.openQuickLook).toHaveBeenCalledWith('i', 1);
    fireEvent.keyDown(r, { key: 'p' });
    expect(state.togglePins).not.toHaveBeenCalled();
    expect(screen.queryByTestId('group-dots')).toBeNull();
  });

  it('renders html with its dots from the extracted text, and no dots while a scan is pending', () => {
    row(html);
    expect(screen.getByTestId('group-dots')).toBeInTheDocument();
    cleanup();
    state.pendingScan = true;
    row(html);
    expect(screen.queryByTestId('group-dots')).toBeNull();
  });

  it('the number cell copies; editing commits through updateClip and expands for multi-line', () => {
    const multi: ClipItem = { id: 'm', type: 'text', content: 'one\ntwo' };
    row(multi, 2);
    fireEvent.click(screen.getByTestId('row-number'));
    expect(state.copyClipToClipboard).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByTestId('clip-line'));
    expect(screen.getByTestId('clip-row').className).toContain('expanded');
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'one\ntwo\nthree' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(state.updateClip).toHaveBeenCalledWith(2, { ...multi, content: 'one\ntwo\nthree' });
    expect(screen.getByTestId('clip-row').className).not.toContain('expanded');
  });

  it('right-click opens the context menu for its row and the menu can close itself', async () => {
    row(text);
    fireEvent.contextMenu(screen.getByTestId('clip-row'));
    expect(screen.getByTestId('menu')).toHaveTextContent('menu for 1');
    await act(async () => {
      fireEvent.click(screen.getByTestId('menu'));
    });
    expect(screen.queryByTestId('menu')).toBeNull();
  });

  it('renders rtf and bookmark rows', () => {
    row({ id: 'r', type: 'rtf', content: '{\\rtf1}', text: 'rich' });
    expect(screen.getByText('rtf')).toBeInTheDocument();
    cleanup();
    row({ id: 'b', type: 'bookmark', content: 'https://x', title: 'T', url: 'https://x' });
    expect(screen.getByText('link')).toBeInTheDocument();
  });
});
