import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import { Tools } from './Tools';
import {
  api,
  defaultConfig,
  fireConfigChanged,
  flush,
  installConfig,
  renderTools,
  SAMPLE,
  term,
  type FakeConfig,
} from './harness';

let config: FakeConfig;

beforeEach(() => {
  vi.resetAllMocks();
  config = installConfig(defaultConfig(), { toolsSampleText: SAMPLE });
});

afterEach(cleanup);

const mount = () => renderTools(<Tools />);

describe('Tools', () => {
  it('is a list pane and an inspector: sections with counts, dots and swatches, and the overview', async () => {
    await mount();
    expect(screen.getByTestId('section-term')).toHaveTextContent('Search terms');
    expect(screen.getByTestId('section-term')).toHaveTextContent('4');
    expect(screen.getByTestId('row-term-t-domain')).toHaveAttribute('data-dot', 'off');
    expect(screen.getByTestId('row-tool-o-scan')).toHaveAttribute('data-dot', 'no');
    expect(screen.getByTestId('row-tool-o-dir')).toHaveAttribute('data-dot', 'orph');
    expect(screen.getByTestId('row-template-p-intake')).toHaveAttribute('data-dot', 'clip');
    expect(screen.getByTestId('row-tool-o-vt')).toHaveAttribute('data-dot', 'ok');
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('Overview');
    const overview = screen.getByTestId('overview');
    expect(within(overview).getByTestId('group-ip')).toHaveTextContent('2 in sample');
    expect(within(overview).getByTestId('group-user')).toHaveTextContent('nothing');
    expect(within(overview).getByTestId('fixes-user')).toHaveTextContent('new term for user');
    expect(within(overview).getByTestId('fixes-domain')).toHaveTextContent('enable Domain name');
    // no sub-tabs, no Test Patterns
    expect(screen.queryByText('Test Patterns')).toBeNull();
  });

  it('collapses a section and walks the list with the keyboard, following on Uses', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('section-template'));
    expect(screen.queryByTestId('row-template-p-sum')).toBeNull();
    fireEvent.click(screen.getByTestId('section-template'));

    const list = screen.getByTestId('list-pane');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByTestId('row-term-t-ip')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-uses').className).toMatch(/on/);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByTestId('row-term-t-email')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(screen.getByTestId('row-term-t-ip')).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(list, { key: 'Enter' });
    expect(screen.getByTestId('term-editor')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('term-editor')).toBeNull();
    expect(screen.getByTestId('uses')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('overview')).toBeInTheDocument();

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: ' ' });
    await flush();
    expect(api().searchTermsUpdate).toHaveBeenCalledWith('t-ip', { enabled: false });
    expect(screen.getByTestId('row-term-t-ip')).toHaveAttribute('data-dot', 'off');
  });

  it('Uses answers both directions and the chips follow to the other item', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    expect(screen.getByTestId('tool-editor')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-uses'));
    const uses = screen.getByTestId('uses');
    expect(uses).toHaveTextContent('ready on the sample');
    expect(within(uses).getByTestId('needs-ip')).toHaveTextContent('IP address');
    expect(uses).toHaveTextContent('Other tools on the same groups');
    expect(uses).toHaveTextContent('none');
    fireEvent.click(within(uses).getByTestId('go-term-t-ip'));
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('IP address');
    const termUses = screen.getByTestId('uses');
    expect(within(termUses).getByTestId('produces-ip')).toHaveTextContent('203.0.113.42');
    expect(within(termUses).getByTestId('produces-ip')).toHaveTextContent('VirusTotal');
    expect(within(termUses).getByTestId('produces-ip')).toHaveTextContent('Incident Summary');

    fireEvent.click(screen.getByTestId('row-tool-o-dir'));
    fireEvent.click(screen.getByTestId('tab-uses'));
    expect(screen.getByTestId('uses')).toHaveTextContent('never ready');
    expect(screen.getByTestId('fixes-user')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('row-template-p-intake'));
    fireEvent.click(screen.getByTestId('tab-uses'));
    expect(screen.getByTestId('uses')).toHaveTextContent('Clip template');
    fireEvent.click(screen.getByTestId('back'));
    expect(screen.getByTestId('overview')).toBeInTheDocument();
  });

  it('fix buttons enable a producer, add from the library, or start a term prefilled with the group', async () => {
    await mount();
    fireEvent.click(within(screen.getByTestId('fixes-domain')).getByText('enable Domain name'));
    await flush();
    expect(api().searchTermsUpdate).toHaveBeenCalledWith('t-domain', { enabled: true });
    expect(screen.getByTestId('toast')).toHaveTextContent('Enabled');
    expect(screen.queryByTestId('fixes-domain')).toBeNull();

    fireEvent.click(within(screen.getByTestId('fixes-user')).getByText('new term for user'));
    const editor = screen.getByTestId('term-editor');
    expect(within(editor).getByTestId('term-pattern')).toHaveValue('(?<user>)');

    fireEvent.click(screen.getByTestId('back'));
    config.tools.push({
      id: 'o-url',
      name: 'Opener',
      url: 'https://o/{url}',
      captureGroups: [],
      createdAt: 0,
      updatedAt: 0,
      order: 0,
    });
    await act(async () => fireConfigChanged());
    await flush();
    fireEvent.click(
      within(screen.getByTestId('fixes-url')).getByText('add "URL" from the library')
    );
    await flush();
    expect(api().searchTermsCreate).toHaveBeenCalledWith('URL', expect.stringContaining('(?<url>'));
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('URL');
  });

  it('creates a search term from the library, sees chips against the sample, and stores nothing before Save', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('new-term'));
    expect(screen.getByTestId('start-from')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('library-guid'));
    expect(screen.getByTestId('term-name')).toHaveValue('GUID');
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
      'GUID',
      expect.stringContaining('(?<guid>')
    );
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('GUID');
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

    config.terms.push(
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

  it('names a single dependent in the singular', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('row-term-t-domain'));
    fireEvent.click(screen.getByTestId('delete'));
    expect(screen.getByRole('dialog')).toHaveTextContent('urlscan depends on a group');
  });

  it('deletes a template', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('row-template-p-intake'));
    fireEvent.click(screen.getByTestId('delete'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete'));
    await flush();
    expect(api().templatesDelete).toHaveBeenCalledWith('p-intake');
  });

  it('creates and edits a template', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('new-template'));
    fireEvent.change(screen.getByTestId('template-name'), { target: { value: 'Block' } });
    fireEvent.change(screen.getByTestId('template-text'), { target: { value: 'Block {ip}' } });
    fireEvent.click(screen.getByTestId('template-save'));
    await flush();
    expect(api().templatesCreate).toHaveBeenCalledWith('Block', 'Block {ip}');
    fireEvent.click(screen.getByTestId('tab-edit'));
    fireEvent.change(screen.getByTestId('template-text'), { target: { value: 'Block {ip} now' } });
    fireEvent.click(screen.getByTestId('template-save'));
    await flush();
    expect(api().templatesUpdate).toHaveBeenCalledWith(expect.any(String), {
      name: 'Block',
      content: 'Block {ip} now',
    });
    fireEvent.click(screen.getByTestId('row-term-t-ticket'));
    fireEvent.click(screen.getByTestId('tab-edit'));
    fireEvent.change(screen.getByTestId('term-name'), { target: { value: 'Ticket' } });
    fireEvent.click(screen.getByTestId('term-save'));
    await flush();
    expect(api().searchTermsUpdate).toHaveBeenCalledWith(
      't-ticket',
      expect.objectContaining({ name: 'Ticket' })
    );
  });

  it('delete asks once and names what depends on a term', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('row-term-t-ip'));
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: 'Delete' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete IP address?');
    expect(dialog).toHaveTextContent('VirusTotal, Incident Summary');
    expect(dialog).toHaveTextContent('depend on a group this search term produces');
    fireEvent.click(within(dialog).getByText('Cancel'));
    expect(api().searchTermsDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('delete'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete'));
    await flush();
    expect(api().searchTermsDelete).toHaveBeenCalledWith('t-ip');
    expect(screen.queryByTestId('row-term-t-ip')).toBeNull();
  });

  it('selecting another item while an edit is dirty asks once', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: 'VT2' } });
    fireEvent.click(screen.getByTestId('row-tool-o-scan'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Discard changes?');
    fireEvent.click(within(dialog).getByText('Keep editing'));
    expect(screen.getByTestId('tool-name')).toHaveValue('VT2');
    fireEvent.click(screen.getByTestId('row-tool-o-scan'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Discard'));
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('urlscan');
    // cancel from the editor goes back to Uses
    fireEvent.click(screen.getByTestId('tool-cancel'));
    expect(screen.getByTestId('uses')).toBeInTheDocument();
    // Esc in the start flow and the close button go back to the overview
    fireEvent.click(screen.getByTestId('new-tool'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('new-template'));
    fireEvent.click(screen.getByTestId('cancel-start'));
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('new-term'));
    fireEvent.click(screen.getByTestId('library-blank'));
    fireEvent.click(screen.getByTestId('term-cancel'));
    expect(screen.getByTestId('overview')).toBeInTheDocument();
  });

  it('picks and resets a group colour from the bucket, in the overview and in Uses', async () => {
    await mount();
    fireEvent.click(
      within(screen.getByTestId('group-ticket')).getByRole('button', { name: 'ticket' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'slot 8' }));
    await flush();
    expect(api().groupColoursSet).toHaveBeenCalledWith({ ticket: 8 });
    fireEvent.click(
      within(screen.getByTestId('group-ticket')).getByRole('button', { name: 'ticket' })
    );
    fireEvent.click(within(screen.getByTestId('bucket')).getByText('reset'));
    await flush();
    expect(api().groupColoursSet).toHaveBeenLastCalledWith({});
    fireEvent.click(
      within(screen.getByTestId('group-ticket')).getByRole('button', { name: 'ticket' })
    );
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('bucket')).toBeNull();

    fireEvent.click(screen.getByTestId('row-term-t-email'));
    fireEvent.click(screen.getByTestId('tab-uses'));
    fireEvent.click(
      within(screen.getByTestId('produces-email')).getByRole('button', { name: 'email' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'slot 9' }));
    await flush();
    expect(api().groupColoursSet).toHaveBeenLastCalledWith({ email: 9 });
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    fireEvent.click(screen.getByTestId('tab-uses'));
    fireEvent.click(within(screen.getByTestId('needs-ip')).getByRole('button', { name: 'ip' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('bucket')).toBeNull();
  });

  it('reports a failed write as a toast and keeps the editor', async () => {
    api().quickToolsUpdate.mockRejectedValueOnce(new Error('disk full'));
    api().searchTermsUpdate.mockRejectedValueOnce(new Error('no'));
    api().groupColoursSet.mockRejectedValueOnce(new Error('colour'));
    api().searchTermsDelete.mockRejectedValueOnce(new Error('locked'));
    await mount();
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: 'VT2' } });
    fireEvent.click(screen.getByTestId('tool-save'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Save failed');
    fireEvent.click(screen.getByTestId('tool-cancel'));
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: ' ' });
    fireEvent.click(screen.getByTestId('row-term-t-ip'));
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: ' ' });
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Toggle failed');
    fireEvent.click(screen.getByTestId('tab-uses'));
    fireEvent.click(within(screen.getByTestId('produces-ip')).getByRole('button', { name: 'ip' }));
    fireEvent.click(screen.getByRole('button', { name: 'slot 3' }));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Colour change failed');
    fireEvent.click(screen.getByTestId('delete'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Delete failed');
  });

  it('reports failed creates, enables and library adds', async () => {
    api()
      .searchTermsCreate.mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'));
    api().quickToolsCreate.mockRejectedValueOnce(new Error('c'));
    api().templatesCreate.mockRejectedValueOnce(new Error('d'));
    api().searchTermsUpdate.mockRejectedValueOnce(new Error('e'));
    await mount();
    fireEvent.click(within(screen.getByTestId('fixes-domain')).getByText('enable Domain name'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Enable failed');
    config.tools.push({
      id: 'o-url',
      name: 'Opener',
      url: 'https://o/{url}',
      captureGroups: [],
      createdAt: 0,
      updatedAt: 0,
      order: 0,
    });
    await act(async () => fireConfigChanged());
    fireEvent.click(
      within(screen.getByTestId('fixes-url')).getByText('add "URL" from the library')
    );
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Add failed');
    fireEvent.click(screen.getByTestId('new-term'));
    fireEvent.click(screen.getByTestId('library-guid'));
    fireEvent.click(screen.getByTestId('term-save'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Save failed');
    fireEvent.click(screen.getByTestId('term-cancel'));
    fireEvent.click(screen.getByTestId('new-tool'));
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('tool-save'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Save failed');
    fireEvent.click(screen.getByTestId('tool-cancel'));
    fireEvent.click(screen.getByTestId('new-template'));
    fireEvent.change(screen.getByTestId('template-name'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('template-text'), { target: { value: 'y' } });
    fireEvent.click(screen.getByTestId('template-save'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Save failed');
  });

  it('shows one loading state until the config arrives and drops a selection that vanished', async () => {
    let resolve: (v: unknown) => void = () => {};
    api().searchTermsGetAll.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await mount();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    await act(async () => resolve([...config.terms]));
    await flush();
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    config.tools = config.tools.filter((t) => t.id !== 'o-vt');
    await act(async () => fireConfigChanged());
    await flush();
    expect(screen.getByTestId('overview')).toBeInTheDocument();
  });
});
