import { act, fireEvent, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { api, fireConfigChanged, flush, type FakeConfig } from './harness';

export function registerToolsFailureCases(
  mount: () => Promise<unknown>,
  getConfig: () => FakeConfig,
  lastToast: () => HTMLElement | undefined,
  addUrlTool: () => Promise<void>
) {
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
    expect(lastToast()).toHaveTextContent('Save failed');
    fireEvent.click(screen.getByTestId('tool-cancel'));
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: ' ' });
    fireEvent.click(screen.getByTestId('row-term-t-ip'));
    fireEvent.keyDown(screen.getByTestId('list-pane'), { key: ' ' });
    await flush();
    expect(lastToast()).toHaveTextContent('Toggle failed');
    fireEvent.click(screen.getByTestId('tab-uses'));
    fireEvent.click(within(screen.getByTestId('produces-ip')).getByRole('button', { name: 'ip' }));
    fireEvent.click(screen.getByRole('button', { name: 'slot 3' }));
    await flush();
    expect(lastToast()).toHaveTextContent('Colour change failed');
    fireEvent.click(screen.getByTestId('delete'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete'));
    await flush();
    expect(lastToast()).toHaveTextContent('Delete failed');
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
    expect(lastToast()).toHaveTextContent('Enable failed');
    await addUrlTool();
    fireEvent.click(
      within(screen.getByTestId('fixes-url')).getByText('add "URL" from the library')
    );
    await flush();
    expect(lastToast()).toHaveTextContent('Add failed');
    fireEvent.click(screen.getByTestId('new-term'));
    fireEvent.click(screen.getByTestId('library-guid'));
    fireEvent.click(screen.getByTestId('term-save'));
    await flush();
    expect(lastToast()).toHaveTextContent('Save failed');
    fireEvent.click(screen.getByTestId('term-cancel'));
    fireEvent.click(screen.getByTestId('new-tool'));
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('tool-save'));
    await flush();
    expect(lastToast()).toHaveTextContent('Save failed');
    fireEvent.click(screen.getByTestId('tool-cancel'));
    fireEvent.click(screen.getByTestId('new-template'));
    fireEvent.change(screen.getByTestId('template-name'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('template-text'), { target: { value: 'y' } });
    fireEvent.click(screen.getByTestId('template-save'));
    await flush();
    expect(lastToast()).toHaveTextContent('Save failed');
  });

  it('shows one loading state until the config arrives and drops a selection that vanished', async () => {
    let resolve: (v: unknown) => void = () => {};
    api().searchTermsGetAll.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await mount();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    await act(async () => resolve([...getConfig().terms]));
    await flush();
    fireEvent.click(screen.getByTestId('row-tool-o-vt'));
    getConfig().tools = getConfig().tools.filter((t) => t.id !== 'o-vt');
    await act(async () => fireConfigChanged());
    await flush();
    expect(screen.getByTestId('overview')).toBeInTheDocument();
  });
}
