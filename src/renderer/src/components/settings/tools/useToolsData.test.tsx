import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { SampleText } from './SampleText';
import { newestClipText, useToolsData } from './useToolsData';
import { api, defaultConfig, flush, installConfig, renderTools } from './harness';

function Probe() {
  const data = useToolsData();
  return (
    <div>
      <span data-testid="loaded">{String(data.loaded)}</span>
      <span data-testid="groups">{data.scan.groups.join(',')}</span>
      <span data-testid="ips">{(data.values.ip ?? []).join(',')}</span>
      <span data-testid="is-clip">{String(data.sampleIsClip)}</span>
      <SampleText />
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('newestClipText', () => {
  it('takes the first clip with text and skips images and empties', () => {
    expect(
      newestClipText([
        { clip: { id: 'a', type: 'image', content: 'data:' }, isLocked: false, timestamp: 0 },
        { clip: { id: 'b', type: 'text', content: '  ' }, isLocked: false, timestamp: 0 },
        {
          clip: { id: 'c', type: 'html', content: '<b>x</b>', text: 'x' },
          isLocked: false,
          timestamp: 0,
        },
      ])
    ).toBe('x');
    expect(newestClipText([])).toBe('');
    expect(newestClipText([{} as never])).toBe('');
  });
});

describe('useToolsData', () => {
  it('loads the config once, scans the sample with it and defaults the sample to the newest clip', async () => {
    installConfig(defaultConfig());
    await renderTools(<Probe />);
    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('is-clip')).toHaveTextContent('true');
    expect(screen.getByTestId('sample-text')).toHaveValue('newest clip text with 10.0.0.1');
    expect(screen.getByTestId('ips')).toHaveTextContent('10.0.0.1');
    expect(screen.getByTestId('sample')).toHaveTextContent('the newest clip');
    expect(api().searchTermsGetAll).toHaveBeenCalledTimes(1);
  });

  it('uses the saved sample text, persists edits on blur and resets to the clip', async () => {
    installConfig(defaultConfig(), { toolsSampleText: 'saved 203.0.113.42' });
    await renderTools(<Probe />);
    expect(screen.getByTestId('is-clip')).toHaveTextContent('false');
    expect(screen.getByTestId('ips')).toHaveTextContent('203.0.113.42');

    const box = screen.getByTestId('sample-text');
    fireEvent.change(box, { target: { value: 'now 198.51.100.7' } });
    expect(screen.getByTestId('ips')).toHaveTextContent('198.51.100.7');
    expect(api().settingsChanged).not.toHaveBeenCalled();
    fireEvent.blur(box);
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(
      expect.objectContaining({ toolsSampleText: 'now 198.51.100.7' })
    );

    // a blur with nothing new writes nothing
    fireEvent.blur(box);
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('reset'));
    await flush();
    expect(api().settingsChanged).toHaveBeenLastCalledWith(
      expect.objectContaining({ toolsSampleText: undefined })
    );
  });

  it('clearing the text removes the setting and falls back to the clip', async () => {
    installConfig(defaultConfig(), { toolsSampleText: 'saved' });
    await renderTools(<Probe />);
    const box = screen.getByTestId('sample-text');
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.blur(box);
    await flush();
    expect(api().settingsChanged).toHaveBeenLastCalledWith(
      expect.objectContaining({ toolsSampleText: undefined })
    );
  });

  it('copes with no clips at all, and a blur with the saved text writes nothing', async () => {
    installConfig(defaultConfig(), { toolsSampleText: 'same' });
    api().storageGetClips.mockResolvedValue(undefined);
    await renderTools(<Probe />);
    const box = screen.getByTestId('sample-text');
    fireEvent.change(box, { target: { value: 'other' } });
    fireEvent.change(box, { target: { value: 'same' } });
    fireEvent.blur(box);
    await flush();
    expect(api().settingsChanged).not.toHaveBeenCalled();
  });

  it('reset with no saved text is a no-op, and a clip read failure is logged', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    installConfig(defaultConfig());
    api().storageGetClips.mockRejectedValue(new Error('no clips'));
    await renderTools(<Probe />);
    expect(error).toHaveBeenCalledWith('Failed to read the newest clip:', expect.any(Error));
    expect(screen.getByTestId('sample-text')).toHaveValue('');
    fireEvent.change(screen.getByTestId('sample-text'), { target: { value: 'typed' } });
    fireEvent.click(screen.getByText('reset'));
    await flush();
    expect(api().settingsChanged).not.toHaveBeenCalled();
    expect(screen.getByTestId('sample-text')).toHaveValue('');
    error.mockRestore();
  });

  it('ignores the clips when unmounted before they arrive', async () => {
    installConfig(defaultConfig());
    let resolve: (v: unknown) => void = () => {};
    api().storageGetClips.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = await renderTools(<Probe />);
    unmount();
    await act(async () => resolve([]));
  });

  it('throws outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/within ToolsDataProvider/);
    spy.mockRestore();
  });
});
