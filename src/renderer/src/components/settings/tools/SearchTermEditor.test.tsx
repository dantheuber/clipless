import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup, within } from '@testing-library/react';
import { SearchTermEditor } from './SearchTermEditor';
import { EditorHostContext } from './editorHost';
import { defaultConfig, flush, installConfig, renderTools, SAMPLE } from './harness';

const onSave = vi.fn();
const onCancel = vi.fn();
const host = { setDirty: vi.fn(), setSaver: vi.fn() };

const mount = (initial = { name: '', pattern: '', enabled: true }) =>
  renderTools(
    <EditorHostContext.Provider value={host}>
      <SearchTermEditor initial={initial} onSave={onSave} onCancel={onCancel} />
    </EditorHostContext.Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  installConfig(defaultConfig(), { toolsSampleText: SAMPLE });
});

afterEach(cleanup);

describe('SearchTermEditor', () => {
  it('validates the four cases from 14.4 and disables Save while invalid', async () => {
    await mount();
    const pattern = screen.getByTestId('term-pattern');
    const save = screen.getByTestId('term-save');
    expect(screen.getByTestId('term-error')).toHaveTextContent('Pattern is empty.');
    expect(save).toBeDisabled();

    fireEvent.change(pattern, { target: { value: '(?<ip>[' } });
    expect(screen.getByTestId('term-error')).toHaveTextContent('Not a valid regular expression.');
    expect(screen.getByTestId('term-editor')).toHaveTextContent('fix the pattern to see chips');

    fireEvent.change(pattern, { target: { value: '(?<ip>\\d*)' } });
    expect(screen.getByTestId('term-error')).toHaveTextContent('Matches the empty string');

    fireEvent.change(pattern, { target: { value: '\\d+' } });
    expect(screen.getByTestId('term-error')).toHaveTextContent('Needs at least one named group');
    expect(screen.getByTestId('term-editor')).toHaveTextContent('nothing yet, add a');

    fireEvent.change(pattern, { target: { value: '(?<c1>\\d+)' } });
    expect(screen.getByTestId('term-error')).toHaveTextContent('"c1" is reserved');

    fireEvent.change(pattern, { target: { value: '(?<ticket>INC-\\d+)' } });
    expect(screen.queryByTestId('term-error')).toBeNull();
    expect(save).toBeDisabled(); // the name is still empty
    fireEvent.change(screen.getByTestId('term-name'), { target: { value: 'Ticket' } });
    expect(save).not.toBeDisabled();
    expect(host.setSaver).toHaveBeenLastCalledWith(expect.any(Function));
  });

  it('shows chips for the pattern under edit against the sample, before Save', async () => {
    await mount({ name: 'Ticket', pattern: '(?<ticket>\\bINC-\\d{4,}\\b)', enabled: true });
    const preview = screen.getByTestId('chips-preview');
    const chips = preview.querySelectorAll('[data-group="ticket"]');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent('INC-4821');
    expect(preview).toHaveTextContent('Investigating alert');
    // nothing was written
    expect(window.api.searchTermsCreate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('term-pattern'), {
      target: { value: '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)' },
    });
    expect(screen.getByTestId('chips-preview').querySelectorAll('[data-group="ip"]')).toHaveLength(
      2
    );
    expect(screen.getByTestId('term-editor')).toHaveTextContent('feeds');
    expect(screen.getByTestId('term-editor')).toHaveTextContent('VirusTotal');
    expect(screen.getByTestId('term-editor')).toHaveTextContent('Incident Summary');
  });

  it('says when nothing matches and who would consume a new group', async () => {
    await mount({ name: 'Hash', pattern: '(?<hash>\\b[a-f0-9]{64}\\b)', enabled: true });
    expect(screen.getByTestId('term-editor')).toHaveTextContent('no matches in the sample');
    expect(screen.getByTestId('term-editor')).toHaveTextContent(
      'nothing yet. Tools and templates that use hash will list here.'
    );
  });

  it('saves the trimmed name, the pattern and the toggle, and reports dirty', async () => {
    await mount({ name: 'IP', pattern: '(?<ip>\\d+)', enabled: true });
    expect(host.setDirty).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByTestId('term-name'), { target: { value: '  IPv4 ' } });
    expect(host.setDirty).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByTestId('term-enabled'));
    fireEvent.click(screen.getByTestId('term-save'));
    await flush();
    expect(onSave).toHaveBeenCalledWith({ name: 'IPv4', pattern: '(?<ip>\\d+)', enabled: false });
    fireEvent.click(screen.getByTestId('term-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('keeps Tab inside the editor', async () => {
    await mount({ name: 'IP', pattern: '(?<ip>\\d+)', enabled: true });
    const editor = screen.getByTestId('term-editor');
    const name = screen.getByTestId('term-name');
    const cancel = screen.getByTestId('term-cancel');
    name.focus();
    fireEvent.keyDown(editor, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(editor, { key: 'Tab' });
    expect(document.activeElement).toBe(name);
    fireEvent.keyDown(editor, { key: 'Tab' });
    expect(document.activeElement).toBe(name);
    within(editor).getByTestId('term-pattern').focus();
    fireEvent.keyDown(editor, { key: 'Enter' });
  });
});
