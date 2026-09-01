import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import type { QuickLookState } from '../../providers/clips/quickLook';
import { FOCUSABLE, QuickLook, textMeta } from './QuickLook';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: {
    count: number;
    getScrollElement: () => Element | null;
    estimateSize: () => number;
  }) => {
    options.getScrollElement();
    const size = options.estimateSize();
    return {
      getTotalSize: () => options.count * size,
      getVirtualItems: () =>
        Array.from({ length: Math.min(12, options.count) }, (_, index) => ({
          key: index,
          index,
          start: index * size,
        })),
      measureElement: () => {},
      scrollToIndex: vi.fn(),
    };
  },
}));

const { state } = vi.hoisted(() => ({
  state: {
    quickLook: {
      openClipId: null as string | null,
      view: 'text' as 'text' | 'source' | 'rendered',
      editing: false,
      returnFocusIndex: null as number | null,
      wrap: false,
    },
    clips: [] as ClipItem[],
    pinned: new Set<string>(),
    togglePins: vi.fn(),
    setPins: vi.fn(),
    updateClip: vi.fn(),
    copyClipToClipboard: vi.fn(),
    closeQuickLook: vi.fn(),
    walkQuickLook: vi.fn(),
    setView: vi.fn(),
    setEditing: vi.fn(),
    toggleWrap: vi.fn(),
    pendingScan: false,
    tools: [{ id: 'vt', name: 'VirusTotal', url: 'https://vt.example/{ip}' }],
    templates: [
      { id: 't', name: 'IP block', content: 'Block {ip}', createdAt: 0, updatedAt: 0, order: 0 },
    ],
    toast: vi.fn(),
    short: false,
    narrow: false,
    codeDetection: true,
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

vi.mock('../../providers/clips', async () => {
  const utils = await import('../../providers/clips/utils');
  const { createQuickLookNavigation, quickLookPosition, targetFromNavigation } = await import(
    '../../providers/clips/quickLook'
  );
  const visible = () => state.clips.map((clip, originalIndex) => ({ clip, originalIndex }));
  return {
    clipText: utils.clipText,
    useQuickLook: () => ({
      quickLook: state.quickLook as QuickLookState,
      openClip: state.clips.find((c) => c.id === state.quickLook.openClipId) ?? null,
      position:
        state.quickLook.openClipId === null
          ? null
          : quickLookPosition(state.clips, visible(), state.quickLook.openClipId, false),
      walkTargets: (() => {
        if (state.quickLook.openClipId === null) return { up: null, down: null };
        const navigation = createQuickLookNavigation(state.clips, visible());
        return {
          up: targetFromNavigation(navigation, state.quickLook.openClipId, -1),
          down: targetFromNavigation(navigation, state.quickLook.openClipId, 1),
        };
      })(),
      closeQuickLook: state.closeQuickLook,
      walkQuickLook: state.walkQuickLook,
      setView: state.setView,
      setEditing: state.setEditing,
      toggleWrap: state.toggleWrap,
    }),
    useClipsData: () => ({ clips: state.clips, filteredClips: visible() }),
    useClipsActions: () => ({
      updateClip: state.updateClip,
      copyClipToClipboard: state.copyClipToClipboard,
    }),
    useClipsPins: () => {
      const pinsByGroup: Record<string, string[]> = {};
      for (const key of state.pinned) {
        const [g, v] = key.split('|');
        (pinsByGroup[g] ??= []).push(v);
      }
      return {
        pins: new Map([...state.pinned].map((k) => [k, {}])),
        pinsByGroup,
        isPinned: (key: string) => state.pinned.has(key),
        togglePins: state.togglePins,
        setPins: state.setPins,
      };
    },
  };
});

vi.mock('../../providers/scan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../providers/scan')>();
  return {
    EMPTY_SCAN: actual.EMPTY_SCAN,
    useScanIndex: () => ({
      getScan: (clip: ClipItem) => (state.pendingScan ? null : ipScan(clip.text ?? clip.content)),
      slotFor: () => 0,
      tools: state.tools,
      templates: state.templates,
    }),
  };
});

vi.mock('../../providers/languageDetection', () => ({
  useLanguageDetection: () => ({ isCodeDetectionEnabled: state.codeDetection }),
}));

vi.mock('../Toast', () => ({ useToast: () => state.toast }));

vi.mock('../../hooks/useMediaQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useMediaQuery')>();
  return {
    ...actual,
    useMediaQuery: (query: string) => (query === actual.SHORT_WINDOW ? state.short : state.narrow),
  };
});

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const textClip: ClipItem = {
  id: 'a',
  type: 'text',
  content: 'first 1.1.1.1\nsecond 2.2.2.2 and 1.1.1.1',
};
const jsonClip: ClipItem = {
  id: 'j',
  type: 'text',
  content: '{"ip": "9.9.9.9"}',
  isCode: true,
  language: 'json',
};
const htmlClip: ClipItem = {
  id: 'h',
  type: 'html',
  content: '<p>hi 3.3.3.3</p>',
  text: 'hi 3.3.3.3',
};
const rtfClip: ClipItem = { id: 'r', type: 'rtf', content: '{\\rtf1 x}', text: 'x' };
const imageClip: ClipItem = {
  id: 'i',
  type: 'image',
  content: 'img',
  imageId: 'img',
  thumbnailDataUrl: 'data:image/png;base64,thumb',
  imageWidth: 640,
  imageHeight: 480,
  imageBytes: 2048,
};
const bookmarkClip: ClipItem = {
  id: 'b',
  type: 'bookmark',
  content: 'https://x',
  title: 'Title',
  url: 'https://x',
};
const emptyClip: ClipItem = { id: 'e', type: 'text', content: '' };

beforeEach(() => {
  vi.clearAllMocks();
  state.clips = [textClip, emptyClip, jsonClip, htmlClip, rtfClip, imageClip, bookmarkClip];
  state.quickLook = {
    openClipId: 'a',
    view: 'text',
    editing: false,
    returnFocusIndex: 0,
    wrap: false,
  };
  state.pinned = new Set();
  state.pendingScan = false;
  state.short = false;
  state.narrow = false;
  state.codeDetection = true;
  api().htmlSanitize.mockResolvedValue({ html: '<p>hi</p>', removed: { script: 2 } });
  api().getFullImage.mockResolvedValue('data:image/png;base64,full');
  api().openExternalUrls.mockResolvedValue(1);
  api().setClipboardText.mockResolvedValue(undefined);
});

afterEach(cleanup);

const openOn = (id: string) => {
  state.quickLook = { ...state.quickLook, openClipId: id };
};

describe('QuickLook', () => {
  it('renders nothing while closed', () => {
    state.quickLook.openClipId = null;
    const { container } = render(<QuickLook />);
    expect(container.innerHTML).toBe('');
  });

  it('draws the clip with gutter, chips, grouped matches and the footer, and takes focus', () => {
    render(<QuickLook />);
    const dialog = screen.getByTestId('quick-look');
    expect(dialog).toHaveFocus();
    expect(screen.getByTestId('ql-clip-number')).toHaveTextContent('Clip 1');
    expect(screen.getByTestId('ql-position')).toHaveTextContent('1 / 6');
    expect(screen.getByTestId('ql-header')).toHaveTextContent(textMeta(textClip.content));
    expect(textMeta(textClip.content)).toBe('2 lines · 40 B');
    const content = screen.getByTestId('ql-content');
    expect(content.querySelectorAll('[data-key]')).toHaveLength(3);
    const side = screen.getByTestId('ql-side');
    expect(side).toHaveTextContent('2 values');
    expect(screen.getByTestId('ql-group-ip')).toHaveTextContent('x2');
    expect(screen.getByTestId('ql-pin-all')).toHaveTextContent('0/2');
    expect(screen.getByTestId('ql-pinned-count')).toHaveTextContent('nothing pinned');
    expect(screen.getByTestId('ql-launch')).toHaveTextContent('Launch');
    expect(screen.getByTestId('ql-launch')).toBeDisabled();
    expect(screen.getByTestId('ql-prev')).toBeDisabled();
    expect(screen.getByTestId('ql-next')).not.toBeDisabled();
  });

  it('pin all in the header and per group toggle every key in the clip', () => {
    render(<QuickLook />);
    fireEvent.click(screen.getByTestId('ql-pin-all'));
    expect(state.togglePins).toHaveBeenCalledWith(['ip|1.1.1.1', 'ip|2.2.2.2']);
    fireEvent.click(screen.getByText('pin all'));
    expect(state.togglePins).toHaveBeenCalledTimes(2);
  });

  it('shows pinned counts, the launch count and unpin all once everything is pinned', () => {
    state.pinned = new Set(['ip|1.1.1.1', 'ip|2.2.2.2']);
    render(<QuickLook />);
    expect(screen.getByTestId('ql-pin-all')).toHaveTextContent('2/2');
    expect(screen.getByTestId('ql-pin-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('unpin all')).toBeInTheDocument();
    expect(screen.getByTestId('ql-pinned-count')).toHaveTextContent('2 pinned');
    expect(screen.getByTestId('ql-launch')).toHaveTextContent('Launch (2 tabs)');
  });

  it('Launch opens every url the pins produce', async () => {
    state.pinned = new Set(['ip|1.1.1.1']);
    render(<QuickLook />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('ql-launch'));
    });
    expect(window.api.openExternalUrls).toHaveBeenCalledWith(['https://vt.example/1.1.1.1']);
  });

  it('keys: Esc closes, Up and Down walk, p pins, c copies, w wraps, t copies a template', () => {
    render(<QuickLook />);
    const dialog = screen.getByTestId('quick-look');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    expect(state.walkQuickLook).toHaveBeenCalledWith(1);
    fireEvent.keyDown(dialog, { key: 'ArrowUp' });
    expect(state.walkQuickLook).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(dialog, { key: 'p' });
    expect(state.togglePins).toHaveBeenCalledWith(['ip|1.1.1.1', 'ip|2.2.2.2']);
    fireEvent.keyDown(dialog, { key: 'c' });
    expect(state.copyClipToClipboard).toHaveBeenCalledWith(0);
    fireEvent.keyDown(dialog, { key: 'w' });
    expect(state.toggleWrap).toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: 't' });
    expect(state.toast).toHaveBeenCalledWith('No template is ready', expect.any(String));
    fireEvent.keyDown(dialog, { key: 'x', ctrlKey: true });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(state.closeQuickLook).toHaveBeenCalledTimes(1);
  });

  it('the header buttons walk, copy, wrap and close; the dimmer closes', () => {
    render(<QuickLook />);
    fireEvent.click(screen.getByTestId('ql-next'));
    expect(state.walkQuickLook).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByTestId('ql-copy'));
    expect(state.copyClipToClipboard).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByTestId('ql-wrap'));
    expect(state.toggleWrap).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('ql-close'));
    fireEvent.click(screen.getByTestId('ql-dimmer'));
    expect(state.closeQuickLook).toHaveBeenCalledTimes(2);
  });

  it('wrap applies a class to the content pane', () => {
    state.quickLook.wrap = true;
    render(<QuickLook />);
    expect(screen.getByTestId('ql-content').className).toContain('wrap');
    expect(screen.getByTestId('ql-wrap')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Tab cycles the reader controls, chips included, and never leaves the dialog', () => {
    render(<QuickLook />);
    const dialog = screen.getByTestId('quick-look');
    const buttons = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
    expect(buttons.some((el) => el.hasAttribute('data-key'))).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(buttons[buttons.length - 2]).toHaveFocus();
  });

  it('hovering a side column value lights its chips in the text and scrolls the first into view', () => {
    const scrolled = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrolled;
    render(<QuickLook />);
    const sideChip = screen
      .getByTestId('ql-group-ip')
      .querySelector('[data-key="ip|1.1.1.1"]') as HTMLElement;
    fireEvent.mouseEnter(sideChip);
    const lit = screen.getByTestId('ql-content').querySelectorAll('[data-key="ip|1.1.1.1"]');
    expect(lit).toHaveLength(2);
    expect(lit[0].className).toContain('lit');
    expect(scrolled).toHaveBeenCalled();
    fireEvent.mouseLeave(sideChip);
    expect(lit[0].className).not.toContain('lit');
  });

  it('clears a stale highlighted value when updated scan data no longer contains it', () => {
    const { rerender } = render(<QuickLook />);
    const sideChip = screen
      .getByTestId('ql-group-ip')
      .querySelector('[data-key="ip|1.1.1.1"]') as HTMLElement;
    fireEvent.mouseEnter(sideChip);

    state.pendingScan = true;
    rerender(<QuickLook />);

    expect(screen.getByTestId('ql-side')).toHaveTextContent('Scanning this clip');
    expect(screen.getByTestId('ql-content').querySelectorAll('.lit')).toHaveLength(0);
  });

  it('e enters edit with the editor at reader size; Enter commits and Esc leaves edit only', () => {
    const { rerender } = render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'e' });
    expect(state.setEditing).toHaveBeenCalledWith(true);
    state.quickLook.editing = true;
    rerender(<QuickLook />);
    const editor = screen.getByTestId('clip-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(textClip.content);
    expect(screen.queryByTestId('ql-content')).toBeNull();
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(state.closeQuickLook).not.toHaveBeenCalled();
    expect(state.setEditing).toHaveBeenLastCalledWith(false);
    fireEvent.change(editor, { target: { value: 'changed' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(state.updateClip).toHaveBeenCalledWith(0, { ...textClip, content: 'changed' });
    // the edit button commits while editing
    fireEvent.click(screen.getByTestId('ql-edit'));
    expect(state.setEditing).toHaveBeenLastCalledWith(false);
  });

  it('committing an unchanged edit saves nothing', () => {
    const { rerender } = render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'e' });
    state.quickLook.editing = true;
    rerender(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('clip-editor'), { key: 'Enter' });
    expect(state.updateClip).not.toHaveBeenCalled();
    expect(state.setEditing).toHaveBeenLastCalledWith(false);
  });

  it('p with no matches pins nothing', () => {
    openOn('b');
    render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'p' });
    expect(state.togglePins).not.toHaveBeenCalled();
  });

  it('ignores the thumbnail load and reports the size once the full image is in', async () => {
    let resolveFull: (s: string) => void = () => {};
    api().getFullImage.mockReturnValueOnce(new Promise((r) => (resolveFull = r)));
    openOn('i');
    render(<QuickLook />);
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 200, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 150, configurable: true });
    fireEvent.load(img);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('640 x 480 px');
    await act(async () => {
      resolveFull('data:image/png;base64,full');
    });
    fireEvent.load(img);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('200 x 150 px');
  });

  it('e while already editing does nothing, and the editor keeps its own keys', () => {
    state.quickLook.editing = true;
    render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('clip-editor'), { key: 'p' });
    expect(state.togglePins).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'e' });
    expect(state.setEditing).not.toHaveBeenCalledWith(true);
  });

  it('colours code with Prism tokens and puts the chip inside the string token', () => {
    openOn('j');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('json');
    const content = screen.getByTestId('ql-content');
    expect(content.querySelector('.tok-property')).not.toBeNull();
    const chip = content.querySelector('[data-key="ip|9.9.9.9"]') as HTMLElement;
    expect(chip.querySelector('.tok-string')).not.toBeNull();
    state.codeDetection = false;
    cleanup();
    render(<QuickLook />);
    expect(screen.getByTestId('ql-content').querySelector('.tok-property')).toBeNull();
  });

  it('html: text view by default, source view without chips, rendered view in a sandboxed frame', async () => {
    openOn('h');
    const { rerender } = render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('html');
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('ql-view-source'));
    expect(state.setView).toHaveBeenCalledWith('source');
    state.quickLook.view = 'source';
    rerender(<QuickLook />);
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(0);
    expect(screen.getByTestId('ql-content').querySelector('.tok-tag')).not.toBeNull();
    expect(screen.getByTestId('ql-side')).toHaveTextContent('The source view has no chips');
    state.quickLook.view = 'rendered';
    rerender(<QuickLook />);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('Sanitising');
    await act(async () => {});
    expect(screen.getByTestId('ql-frame')).toHaveAttribute('sandbox', '');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('removed: script x2');
  });

  it('rtf offers text and source only; a bookmark shows a link tag on two lines', () => {
    openOn('r');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-view-source')).toBeInTheDocument();
    expect(screen.queryByTestId('ql-view-rendered')).toBeNull();
    cleanup();
    openOn('b');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('link');
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-index]')).toHaveLength(2);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('No search terms match this clip.');
  });

  it('image: fitted viewer, details in the side column, edit and wrap greyed, w ignored', async () => {
    openOn('i');
    render(<QuickLook />);
    await act(async () => {});
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,full');
    expect(screen.getByTestId('ql-header')).toHaveTextContent('png');
    expect(screen.getByTestId('ql-header')).toHaveTextContent('640 x 480, 2 KB');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('640 x 480 px');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('image store');
    expect(screen.getByTestId('ql-edit')).toBeDisabled();
    expect(screen.getByTestId('ql-wrap')).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'w' });
    expect(state.toggleWrap).not.toHaveBeenCalled();
    Object.defineProperty(img, 'naturalWidth', { value: 1280 });
    Object.defineProperty(img, 'naturalHeight', { value: 720 });
    fireEvent.load(img);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('1280 x 720 px');
  });

  it('image without an image store entry or dimensions shows what it knows', async () => {
    state.clips = [{ id: 'i2', type: 'image', content: 'data:image/gif;base64,abcd' }];
    openOn('i2');
    render(<QuickLook />);
    await act(async () => {});
    expect(window.api.getFullImage).not.toHaveBeenCalled();
    expect(screen.getByTestId('ql-side')).toHaveTextContent('size unknown');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('stored inline');
    expect(screen.getByTestId('ql-header')).toHaveTextContent('gif');
  });

  it('logs when the full image fails to load and keeps the thumbnail', async () => {
    api().getFullImage.mockRejectedValueOnce(new Error('gone'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    openOn('i');
    render(<QuickLook />);
    await act(async () => {});
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,thumb');
    expect(errSpy).toHaveBeenCalledWith('Failed to load full image:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('says the clip is still scanning while a large scan is pending', () => {
    state.pendingScan = true;
    render(<QuickLook />);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('Scanning this clip');
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(0);
    expect(screen.getByTestId('ql-pin-all')).toBeDisabled();
  });

  it('folds the side column under the content in a narrow window and opens it on click', () => {
    state.narrow = true;
    render(<QuickLook />);
    const side = screen.getByTestId('ql-side');
    expect(side.querySelector('[role="button"]')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('ql-group-ip')).toBeNull();
    fireEvent.click(side.querySelector('[role="button"]') as HTMLElement);
    expect(screen.getByTestId('ql-group-ip')).toBeInTheDocument();
  });

  it('drops the hints and the not-ready pills in a short window', () => {
    state.short = true;
    render(<QuickLook />);
    expect(screen.getByTestId('ql-footer')).not.toHaveTextContent('pin all');
    expect(screen.queryByTestId('template-pills')).toBeNull();
  });

  it('the prev button walks up from a later clip', () => {
    openOn('j');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-prev')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('ql-prev'));
    expect(state.walkQuickLook).toHaveBeenCalledWith(-1);
  });

  it('rtf source view has no chips and no syntax colouring', () => {
    openOn('r');
    state.quickLook.view = 'source';
    render(<QuickLook />);
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(0);
    expect(screen.getByTestId('ql-content').querySelector('[class^="tok-"]')).toBeNull();
  });

  it('lists what the sanitiser removed, or nothing', async () => {
    openOn('h');
    state.quickLook.view = 'rendered';
    api().htmlSanitize.mockResolvedValue({ html: '<p>x</p>', removed: {} });
    render(<QuickLook />);
    await act(async () => {});
    expect(screen.getByTestId('ql-side')).toHaveTextContent('nothing removed');
    cleanup();
    api().htmlSanitize.mockResolvedValue({ html: '<p>x</p>', removed: { img: 1 } });
    render(<QuickLook />);
    await act(async () => {});
    expect(screen.getByTestId('ql-side')).toHaveTextContent('removed: img');
  });

  it('an image with no data url format says image and unknown', async () => {
    state.clips = [{ id: 'i3', type: 'image', content: 'img3', imageId: 'img3' }];
    api().getFullImage.mockResolvedValue(null);
    openOn('i3');
    render(<QuickLook />);
    await act(async () => {});
    expect(screen.getByTestId('ql-header')).toHaveTextContent('image');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('format unknown');
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('img3');
  });

  it('hovering a value with no chip in the text is harmless, as is a pane without scrollIntoView', () => {
    const original = HTMLElement.prototype.scrollIntoView;
    // @ts-expect-error jsdom has no scrollIntoView; make sure the reader copes without one
    delete HTMLElement.prototype.scrollIntoView;
    render(<QuickLook />);
    const sideChip = screen
      .getByTestId('ql-group-ip')
      .querySelector('[data-key="ip|2.2.2.2"]') as HTMLElement;
    fireEvent.mouseEnter(sideChip);
    expect(
      screen.getByTestId('ql-content').querySelector('[data-key="ip|2.2.2.2"]')?.className
    ).toContain('lit');
    HTMLElement.prototype.scrollIntoView = original;
  });

  it('textMeta counts lines and bytes', () => {
    expect(textMeta('')).toBe('0 lines · 0 B');
    expect(textMeta('a')).toBe('1 line · 1 B');
    expect(textMeta('é\nb')).toBe('2 lines · 4 B');
    expect(textMeta('😀')).toBe('1 line · 4 B');
    expect(textMeta('\ud800€')).toBe('1 line · 6 B');
  });

  it('renders bounded line work for a very large multiline code clip', () => {
    const content = Array.from({ length: 10_000 }, (_, i) => `const value${i} = ${i};`).join('\n');
    state.clips = [{ id: 'large', type: 'text', content, isCode: true, language: 'javascript' }];
    openOn('large');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('10000 lines');
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-index]')).toHaveLength(12);
    expect(screen.getByTestId('ql-content').querySelector('[data-index="9999"]')).toBeNull();
  });
});
