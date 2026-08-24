import { act, fireEvent, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { api, fireConfigChanged, flush, installConfig, term, type FakeConfig } from './harness';

export function registerToolsEditingCases(
  mount: () => Promise<unknown>,
  getConfig: () => FakeConfig
) {
  it('creates a search term from the library, sees chips against the sample, and stores nothing before Save', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('new-term'));
    expect(screen.getByTestId('start-from')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('library-guid'));
    expect(screen.getByTestId('term-name')).toHaveValue('UUID');
    fireEvent.change(screen.getByTestId('sample-text'), {
      target: { value: 'id 123e4567-e89b-12d3-a456-426614174000 here' },
    });
    expect(
      screen.getByTestId('chips-preview').querySelector('[data-group="guid"]')
    ).toHaveTextContent('123e4567');
    expect(api().searchTermsCreate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('term-save'));
    await flush();
    expect(api().searchTermsCreate).toHaveBeenCalledWith(
      'UUID',
      expect.stringContaining('(?<guid>')
    );
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('UUID');
    expect(screen.getByTestId('uses')).toBeInTheDocument();
    expect(screen.getByTestId('section-term')).toHaveTextContent('5');
  });

  it('a disabled term saved from the editor is stored disabled, and an existing library entry is selected', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('new-term'));
    fireEvent.click(screen.getByTestId('library-blank'));
    fireEvent.change(screen.getByTestId('term-name'), { target: { value: 'Hash' } });
    fireEvent.change(screen.getByTestId('term-pattern'), {
      target: { value: '(?<hash>[a-f0-9]{8})' },
    });
    fireEvent.click(screen.getByTestId('term-enabled'));
    fireEvent.click(screen.getByTestId('term-save'));
    await flush();
    expect(api().searchTermsUpdate).toHaveBeenCalledWith(expect.any(String), { enabled: false });

    getConfig().terms.push(
      term(
        't-mac',
        'Old MAC',
        '(?<mac>\\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\\b)',
        false
      )
    );
    await act(async () => fireConfigChanged());
    fireEvent.click(screen.getByTestId('new-term'));
    fireEvent.click(screen.getByTestId('library-mac'));
    await flush();
    expect(api().searchTermsUpdate).toHaveBeenCalledWith('t-mac', { enabled: true });
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('Old MAC');
  });

  it('makes a tool with a picked token and sees the tab count, then edits and deletes it', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('new-tool'));
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: 'AbuseIPDB' } });
    const url = screen.getByTestId('tool-url') as HTMLInputElement;
    fireEvent.change(url, { target: { value: 'https://www.abuseipdb.com/check/' } });
    url.setSelectionRange(url.value.length, url.value.length);
    fireEvent.click(
      screen.getByTestId('token-picker').querySelector('[data-group="ip"]') as HTMLElement
    );
    expect(url).toHaveValue('https://www.abuseipdb.com/check/{ip}');
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent(
      'Would open 2 tabs from the sample'
    );
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await flush();
    expect(api().quickToolsCreate).toHaveBeenCalledWith(
      'AbuseIPDB',
      'https://www.abuseipdb.com/check/{ip}',
      []
    );
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('AbuseIPDB');

    fireEvent.click(screen.getByTestId('tab-edit'));
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: 'Abuse' } });
    fireEvent.click(screen.getByTestId('tool-save'));
    await flush();
    expect(api().quickToolsUpdate).toHaveBeenCalledWith(expect.any(String), {
      name: 'Abuse',
      url: 'https://www.abuseipdb.com/check/{ip}',
    });

    fireEvent.click(screen.getByTestId('delete'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Nothing depends on this tool');
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete'));
    await flush();
    expect(api().quickToolsDelete).toHaveBeenCalled();
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Deleted');
  });

  it('walks an empty list without moving, and shows a term that produces nothing', async () => {
    installConfig({
      terms: [term('bare', 'Bare', '\\d+')],
      tools: [],
      templates: [],
      groupColours: {},
    });
    await mount();
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: 'ArrowDown' });
    fireEvent.click(screen.getByTestId('row-term-bare'));
    fireEvent.click(screen.getByTestId('tab-uses'));
    expect(screen.getByTestId('uses')).toHaveTextContent('produces nothing');
    fireEvent.click(screen.getByTestId('delete'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete'));
    await flush();
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: 'ArrowDown' });
    expect(screen.getByTestId('overview')).toBeInTheDocument();
  });

  it('Ctrl+S with nothing to save, Esc in the overview, and an enabled library duplicate', async () => {
    await mount();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('new-term'));
    fireEvent.click(screen.getByTestId('library-email'));
    await flush();
    expect(api().searchTermsUpdate).not.toHaveBeenCalled();
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('Email address');
    fireEvent.click(screen.getByTestId('row-term-t-domain'));
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: ' ' });
    await flush();
    expect(api().searchTermsUpdate).toHaveBeenCalledWith('t-domain', { enabled: true });
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('enabled');
  });
}
