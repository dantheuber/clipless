import { fireEvent, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { api, flush } from './harness';

export function registerToolsDeletionCases(mount: () => Promise<unknown>) {
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
    fireEvent.click(screen.getByTestId('tool-cancel'));
    expect(screen.getByTestId('uses')).toBeInTheDocument();
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
}
