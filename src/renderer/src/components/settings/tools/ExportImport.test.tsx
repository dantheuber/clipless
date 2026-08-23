import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup, within } from '@testing-library/react';
import { ExportImport, summarizeConfig } from './ExportImport';
import { api, defaultConfig, flush, installConfig, renderTools } from './harness';

beforeEach(() => {
  vi.clearAllMocks();
  installConfig(defaultConfig());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('summarizeConfig', () => {
  it('counts what a config adds and lists its groups', () => {
    const text = JSON.stringify({
      searchTerms: [
        { pattern: '(?<ip>x)' },
        { pattern: '(?<ip>y)(?<port>z)' },
        { name: 'no pattern' },
      ],
      tools: [{}],
      groupColours: { ip: 3 },
    });
    expect(summarizeConfig(text)).toMatchObject({
      summary: { terms: 3, tools: 1, templates: 0, groups: ['ip', 'port'], colours: 1 },
    });
  });

  it('lists a group once across terms', () => {
    const text = JSON.stringify({
      searchTerms: [{ pattern: '(?<ip>a)' }, { pattern: '(?<ip>b)' }],
    });
    expect(summarizeConfig(text)).toMatchObject({ summary: { groups: ['ip'] } });
  });

  it('says why a text cannot be imported', () => {
    expect(summarizeConfig('   ')).toEqual({ error: '' });
    expect(summarizeConfig('{')).toEqual({ error: 'Not valid JSON yet.' });
    expect(summarizeConfig('[1]')).toMatchObject({
      error: expect.stringMatching(/expected an object/),
    });
    expect(summarizeConfig('{"version":"1"}')).toMatchObject({
      error: expect.stringMatching(/no searchTerms/),
    });
  });
});

describe('ExportImport', () => {
  it('export shows the counts and the JSON, then copies with a toast', async () => {
    api().quickClipsExportConfig.mockResolvedValue({
      searchTerms: [],
      tools: [],
      templates: [],
      groupColours: { ip: 1 },
      version: '2.0.0',
    });
    await renderTools(<ExportImport />);
    fireEvent.click(screen.getByTestId('tools-export'));
    await flush();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('4 search terms, 3 tools, 2 templates');
    expect((screen.getByLabelText('Config JSON') as HTMLTextAreaElement).value).toContain(
      '"groupColours"'
    );
    fireEvent.click(screen.getByText('Copy JSON'));
    await flush();
    expect(api().setClipboardText).toHaveBeenCalledWith(
      expect.stringContaining('"version": "2.0.0"')
    );
    expect(screen.getByTestId('toast')).toHaveTextContent('Copied the config');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('export can save a file, and a failure to export shows inline', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await renderTools(<ExportImport />);
    fireEvent.click(screen.getByTestId('tools-export'));
    await flush();
    fireEvent.click(screen.getByText('Save file'));
    expect(screen.getByTestId('toast')).toHaveTextContent('Saved clipless-tools-config.json');

    api().quickClipsExportConfig.mockRejectedValueOnce(new Error('storage locked'));
    fireEvent.click(screen.getByTestId('tools-export'));
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('storage locked');
    expect(screen.getByText('Copy JSON')).toBeDisabled();
    fireEvent.click(screen.getByText('Close'));
    api().quickClipsExportConfig.mockRejectedValueOnce('plain failure');
    fireEvent.click(screen.getByTestId('tools-export'));
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('plain failure');
    fireEvent.click(screen.getByText('Close'));
  });

  it('import previews the counts and groups, then merges or replaces with the mode', async () => {
    await renderTools(<ExportImport />);
    fireEvent.click(screen.getByTestId('tools-import'));
    expect(screen.getByText('Merge')).toBeDisabled();
    fireEvent.change(screen.getByTestId('import-json'), { target: { value: '{ nope' } });
    expect(screen.getByTestId('import-summary')).toHaveTextContent('Not valid JSON yet.');

    const config = {
      searchTerms: [{ name: 'GUID', pattern: '(?<guid>[0-9a-f-]{36})' }],
      tools: [{ name: 'x', url: 'https://x/{guid}' }],
      templates: [],
    };
    fireEvent.change(screen.getByTestId('import-json'), {
      target: { value: JSON.stringify(config) },
    });
    const summary = screen.getByTestId('import-summary');
    expect(summary).toHaveTextContent('Adds 1 search terms, 1 tools, 0 templates');
    expect(summary.querySelector('[data-group="guid"]')).toBeInTheDocument();
    expect(summary).toHaveTextContent(
      'Replace all deletes your 4 search terms, 3 tools and 2 templates first'
    );

    fireEvent.click(screen.getByTestId('import-merge'));
    await flush();
    expect(api().quickClipsImportConfig).toHaveBeenCalledWith(config, 'merge');
    expect(screen.getByTestId('toast')).toHaveTextContent('Merged the config');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('tools-import'));
    fireEvent.change(screen.getByTestId('import-json'), {
      target: { value: JSON.stringify({ ...config, groupColours: { guid: 7 } }) },
    });
    expect(screen.getByTestId('import-summary')).toHaveTextContent('and 1 colours');
    fireEvent.click(screen.getByTestId('import-replace'));
    await flush();
    expect(api().quickClipsImportConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ groupColours: { guid: 7 } }),
      'replace'
    );
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Replaced the config');
  });

  it('keeps an import failure inline and reads a picked file', async () => {
    api()
      .quickClipsImportConfig.mockRejectedValueOnce(new Error('bad config'))
      .mockRejectedValueOnce('worse');
    await renderTools(<ExportImport />);
    fireEvent.click(screen.getByTestId('tools-import'));
    const file = new File([JSON.stringify({ tools: [] })], 'team.json');
    fireEvent.change(screen.getByTestId('import-config-file'), { target: { files: [file] } });
    await flush();
    await flush();
    expect((screen.getByTestId('import-json') as HTMLTextAreaElement).value).toBe('{"tools":[]}');
    fireEvent.click(screen.getByTestId('import-merge'));
    await flush();
    expect(within(screen.getByRole('dialog')).getByText('bad config')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('import-replace'));
    await flush();
    expect(within(screen.getByRole('dialog')).getByText('worse')).toBeInTheDocument();
    fireEvent.click(screen.getByText('pick a file'));
    fireEvent.change(screen.getByTestId('import-config-file'), { target: { files: [] } });
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
