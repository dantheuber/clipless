import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import type { ClipItem } from '../../../../shared/types';
import { ToastProvider } from '../Toast';
import { ScanIndexProvider } from '../../providers/scan';
import { ClipsProvider, useClipsActions, useClipsData } from '../../providers/clips';
import { Clips } from './Clips';

library.add(faEye);

// jsdom has no layout. Render the visible window while preserving the virtualizer's keys.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    getItemKey,
  }: {
    count: number;
    getItemKey?: (i: number) => string;
  }) => ({
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, index) => ({
        key: getItemKey?.(index) ?? index,
        index,
        start: index * 40,
      })),
    measureElement: () => {},
    scrollToIndex: () => {},
  }),
}));

const initialClips: ClipItem[] = [
  { id: 'first', type: 'text', content: 'First clip' },
  { id: 'second', type: 'text', content: 'Second clip' },
  { id: 'third', type: 'text', content: 'Third clip' },
  { id: 'fourth', type: 'text', content: 'Fourth clip' },
];
const captured: ClipItem = { id: 'captured', type: 'text', content: 'New capture' };

function Probe() {
  const { clips } = useClipsData();
  const { clipboardUpdated, emptyClip } = useClipsActions();
  return (
    <>
      <button onClick={() => clipboardUpdated(captured)}>Capture</button>
      <button onClick={() => emptyClip(2)}>Delete edited clip</button>
      <output data-testid="history">{JSON.stringify(clips)}</output>
    </>
  );
}

async function mount() {
  vi.mocked(window.api.storageGetClipsSnapshot).mockResolvedValue({
    loadState: { complete: true, error: null },
    clips: initialClips.map((clip) => ({ clip, isLocked: false, timestamp: 1 })),
  });
  render(
    <ToastProvider>
      <ScanIndexProvider>
        <ClipsProvider>
          <Clips />
          <Probe />
        </ClipsProvider>
      </ScanIndexProvider>
    </ToastProvider>
  );
  await screen.findByText('Third clip');
}

const history = (): ClipItem[] => JSON.parse(screen.getByTestId('history').textContent!);

afterEach(() => {
  cleanup();
  vi.mocked(window.api.storageGetClipsSnapshot).mockResolvedValue({
    loadState: { complete: true, error: null },
    clips: [],
  });
});

describe('inline edit identity', () => {
  it.each(['Enter', 'blur'])(
    'keeps the editor attached to its clip after a capture and commits with %s',
    async (commit) => {
      await mount();
      fireEvent.click(screen.getByText('Third clip'));
      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: 'Edited third clip' } });

      fireEvent.click(screen.getByText('Capture'));

      expect(within(screen.getByRole('row', { name: 'Clip 4' })).getByRole('textbox')).toBe(editor);
      if (commit === 'Enter') fireEvent.keyDown(editor, { key: 'Enter' });
      else fireEvent.blur(editor);

      expect(history().slice(0, 5)).toEqual([
        captured,
        initialClips[0],
        initialClips[1],
        { ...initialClips[2], content: 'Edited third clip' },
        initialClips[3],
      ]);
      expect(screen.queryByRole('textbox')).toBeNull();
    }
  );

  it('leaves every clip unchanged when an untouched draft is committed after a capture', async () => {
    await mount();
    fireEvent.click(screen.getByText('Third clip'));
    fireEvent.click(screen.getByText('Capture'));
    fireEvent.blur(screen.getByRole('textbox'));

    expect(history().slice(0, 5)).toEqual([captured, ...initialClips]);
  });

  it('discards the draft when the edited clip is deleted', async () => {
    await mount();
    fireEvent.click(screen.getByText('Third clip'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Discard this draft' } });

    fireEvent.click(screen.getByText('Delete edited clip'));

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(history().some((clip) => clip.id === 'third')).toBe(false);
    expect(history().slice(0, 2)).toEqual(initialClips.slice(0, 2));
    expect(history()[2].content).toBe('');
    expect(history()[3]).toEqual(initialClips[3]);
  });
});
