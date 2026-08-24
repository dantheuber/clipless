import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import { Tools } from './Tools';
import { registerToolsDeletionCases } from './ToolsDeletion.cases';
import { registerToolsEditingCases } from './ToolsEditing.cases';
import { registerToolsFailureCases } from './ToolsFailure.cases';
import {
  api,
  defaultConfig,
  fireConfigChanged,
  flush,
  installConfig,
  renderTools,
  SAMPLE,
  type FakeConfig,
} from './harness';

let config: FakeConfig;

beforeEach(() => {
  vi.resetAllMocks();
  config = installConfig(defaultConfig(), { toolsSampleText: SAMPLE });
});

afterEach(cleanup);

const mount = () => renderTools(<Tools />);
const lastToast = () => screen.getAllByTestId('toast').pop();
const addUrlTool = async () => {
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
};

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
    await addUrlTool();
    await flush();
    fireEvent.click(
      within(screen.getByTestId('fixes-url')).getByText('add "URL" from the library')
    );
    await flush();
    expect(api().searchTermsCreate).toHaveBeenCalledWith('URL', expect.stringContaining('(?<url>'));
    expect(screen.getByTestId('inspector-title')).toHaveTextContent('URL');
  });

  registerToolsEditingCases(mount, () => config);
  registerToolsDeletionCases(mount);
  registerToolsFailureCases(mount, () => config, lastToast, addUrlTool);
});
