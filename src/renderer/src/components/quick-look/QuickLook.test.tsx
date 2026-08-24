import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ClipItem } from '../../../../shared/types';
import type { QuickLookState } from '../../providers/clips/quickLook';
import { QuickLook } from './QuickLook';
import { ipScan } from '../clips/clip/clipTestFixtures';
import { registerQuickLookFormatCases } from './QuickLookFormat.cases';
import { registerQuickLookInteractionCases } from './QuickLookInteraction.cases';
import { registerQuickLookSyntaxCases } from './QuickLookSyntax.cases';
import type { QuickLookTestState } from './quickLookTestTypes';

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
  } as QuickLookTestState,
}));

vi.mock('../../providers/clips', async () => {
  const utils = await import('../../providers/clips/utils');
  const { quickLookPosition } = await import('../../providers/clips/quickLook');
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
  const { scanIndexTestHooks } = await import('../clips/clip/clipTestFixtures');
  return scanIndexTestHooks(
    actual.EMPTY_SCAN,
    (clip: ClipItem) => (state.pendingScan ? null : ipScan(clip.text ?? clip.content)),
    0,
    { tools: state.tools, templates: state.templates }
  );
});

vi.mock('../../providers/languageDetection', () => ({
  useLanguageDetection: () => ({ isCodeDetectionEnabled: state.codeDetection }),
}));

vi.mock('../useToast', () => ({ useToast: () => state.toast }));

vi.mock('../../hooks/useMediaQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useMediaQuery')>();
  const { mediaQueryTestHooks } = await import('../mediaQueryTestHooks');
  return mediaQueryTestHooks(actual, state);
});

const api = () => window.api as unknown as Record<string, Mock>;

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

  registerQuickLookInteractionCases({ state, api, openOn });
  registerQuickLookSyntaxCases({ state, api, openOn });
  registerQuickLookFormatCases({ state, api, openOn });
});
