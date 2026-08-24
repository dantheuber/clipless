import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { expect, it, vi } from 'vitest';
import type { SettingsApplyResult, UserSettings } from '../../../../../shared/types';
import { SettingsProvider } from './SettingsProvider';
import { useSettingsStore } from './useSetting';

type TestApi = () => Record<string, ReturnType<typeof vi.fn>>;

interface SettingCasesContext {
  api: TestApi;
  mount: () => Promise<void>;
  flush: () => Promise<void>;
  deferSettingsChanged: () => void;
  getResolvers: () => ((result: SettingsApplyResult) => void)[];
  stored: UserSettings;
  Row: ComponentType<{ name: 'startMinimized' | 'alwaysOnTop' | 'autoStart' }>;
}

export function registerSettingsProviderCases({
  api,
  mount,
  flush,
  deferSettingsChanged,
  getResolvers,
  stored,
  Row,
}: SettingCasesContext) {
  it('a rejected write reads as not saved with the error text, even when the rollback write fails too', async () => {
    api().settingsChanged.mockRejectedValue(new Error('ipc down'));
    await mount();
    fireEvent.click(screen.getByText('alwaysOnTop'));
    await flush();
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('not saved');
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('ipc down');
    expect(screen.getByTestId('value-alwaysOnTop')).toHaveTextContent('false');
  });

  it('never disables one control for another: two saves run side by side with their own slots', async () => {
    deferSettingsChanged();
    await mount();
    fireEvent.click(screen.getByText('startMinimized'));
    fireEvent.click(screen.getByText('alwaysOnTop'));
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saving');
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('saving');
    expect(api().settingsChanged).toHaveBeenLastCalledWith({
      ...stored,
      startMinimized: true,
      alwaysOnTop: true,
    });

    await act(async () => getResolvers()[1]({ ok: true, failed: [] }));
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('saved');
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saving');

    await act(async () => getResolvers()[0]({ ok: false, failed: [] }));
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('not saved');
    expect(screen.getByTestId('value-startMinimized')).toHaveTextContent('false');
    expect(screen.getByTestId('value-alwaysOnTop')).toHaveTextContent('true');
    expect(api().settingsChanged).toHaveBeenLastCalledWith({
      ...stored,
      startMinimized: false,
      alwaysOnTop: true,
    });
  });

  it('accept decides success from the answer, so a hotkey row can ignore failures on other rows', async () => {
    function Custom() {
      const { commit, statuses } = useSettingsStore();
      return (
        <>
          <button
            onClick={() =>
              commit({ maxClips: 60 }, ['maxClips'], {
                accept: (r) => !r.failed.includes('Ctrl+Shift+1'),
              })
            }
          >
            go
          </button>
          <span data-testid="st">{statuses.maxClips?.kind}</span>
        </>
      );
    }
    api().settingsChanged.mockResolvedValue({ ok: false, failed: ['Ctrl+Shift+2'] });
    render(
      <SettingsProvider>
        <Custom />
      </SettingsProvider>
    );
    await flush();
    fireEvent.click(screen.getByText('go'));
    await flush();
    expect(screen.getByTestId('st')).toHaveTextContent('saved');
  });

  it('setStatus sets and clears a slot by hand', async () => {
    function Custom() {
      const { setStatus, statuses } = useSettingsStore();
      return (
        <>
          <button onClick={() => setStatus('x', { kind: 'saving' })}>set</button>
          <button onClick={() => setStatus('x', null)}>clear</button>
          <span data-testid="st">{statuses.x?.kind ?? 'none'}</span>
        </>
      );
    }
    render(
      <SettingsProvider>
        <Custom />
      </SettingsProvider>
    );
    await flush();
    fireEvent.click(screen.getByText('set'));
    expect(screen.getByTestId('st')).toHaveTextContent('saving');
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('st')).toHaveTextContent('none');
  });

  it('refuses to commit before the settings have loaded', async () => {
    let answer: SettingsApplyResult | null = null;
    function Early() {
      const { commit } = useSettingsStore();
      return (
        <button
          onClick={() => {
            commit({ maxClips: 1 }, ['maxClips']).then((r) => {
              answer = r;
            });
          }}
        >
          early
        </button>
      );
    }
    api().storageGetSettings.mockReturnValue(new Promise(() => {}));
    render(
      <SettingsProvider>
        <Early />
      </SettingsProvider>
    );
    fireEvent.click(screen.getByText('early'));
    await flush();
    expect(answer).toEqual({ ok: false, failed: [], message: 'settings are not loaded' });
    expect(api().settingsChanged).not.toHaveBeenCalled();
  });

  it('useSetting throws outside the provider', () => {
    expect(() => render(<Row name="autoStart" />)).toThrow(/within SettingsProvider/);
  });
}
