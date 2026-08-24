import {
  act,
  expect,
  fireEvent,
  it,
  QuickLook,
  render,
  screen,
  textMeta,
  vi,
  type QuickLookCaseContext,
} from './quickLookCaseHarness';

export function registerQuickLookInteractionCases({ state, api, openOn }: QuickLookCaseContext) {
  it('draws the clip with gutter, chips, grouped matches and the footer, and takes focus', () => {
    render(<QuickLook />);
    const dialog = screen.getByTestId('quick-look');
    expect(dialog).toHaveFocus();
    expect(screen.getByTestId('ql-clip-number')).toHaveTextContent('Clip 1');
    expect(screen.getByTestId('ql-position')).toHaveTextContent('1 / 6');
    expect(screen.getByTestId('ql-header')).toHaveTextContent(textMeta(state.clips[0].content));
    expect(textMeta(state.clips[0].content)).toBe('2 lines · 40 B');
    const content = screen.getByTestId('ql-content');
    expect(content.querySelectorAll('[data-key]')).toHaveLength(3);
    const side = screen.getByTestId('ql-side');
    expect(side).toHaveTextContent('2 values');
    expect(screen.getByTestId('ql-group-ip')).toHaveTextContent('x2');
    expect(screen.getByTestId('ql-pin-all')).toHaveTextContent('0/2');
    expect(screen.getByTestId('ql-pinned-count')).toHaveTextContent('nothing pinned');
    expect(screen.getByTestId('ql-launch')).toHaveTextContent('Launch');
    expect(screen.getByTestId('ql-launch')).toBeDisabled();
    expect(screen.getByTestId('ql-prev')).toBeDisabled();
    expect(screen.getByTestId('ql-next')).not.toBeDisabled();
  });

  it('pin all in the header and per group toggle every key in the clip', () => {
    render(<QuickLook />);
    fireEvent.click(screen.getByTestId('ql-pin-all'));
    expect(state.togglePins).toHaveBeenCalledWith(['ip|1.1.1.1', 'ip|2.2.2.2']);
    fireEvent.click(screen.getByText('pin all'));
    expect(state.togglePins).toHaveBeenCalledTimes(2);
  });

  it('shows pinned counts, the launch count and unpin all once everything is pinned', () => {
    state.pinned = new Set(['ip|1.1.1.1', 'ip|2.2.2.2']);
    render(<QuickLook />);
    expect(screen.getByTestId('ql-pin-all')).toHaveTextContent('2/2');
    expect(screen.getByTestId('ql-pin-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('unpin all')).toBeInTheDocument();
    expect(screen.getByTestId('ql-pinned-count')).toHaveTextContent('2 pinned');
    expect(screen.getByTestId('ql-launch')).toHaveTextContent('Launch (2 tabs)');
  });

  it('Launch opens every url the pins produce', async () => {
    state.pinned = new Set(['ip|1.1.1.1']);
    render(<QuickLook />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('ql-launch'));
    });
    expect(window.api.openExternalUrls).toHaveBeenCalledWith(['https://vt.example/1.1.1.1']);
  });

  it('keys: Esc closes, Up and Down walk, p pins, c copies, w wraps, t copies a template', () => {
    render(<QuickLook />);
    const dialog = screen.getByTestId('quick-look');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    expect(state.walkQuickLook).toHaveBeenCalledWith(1);
    fireEvent.keyDown(dialog, { key: 'ArrowUp' });
    expect(state.walkQuickLook).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(dialog, { key: 'p' });
    expect(state.togglePins).toHaveBeenCalledWith(['ip|1.1.1.1', 'ip|2.2.2.2']);
    fireEvent.keyDown(dialog, { key: 'c' });
    expect(state.copyClipToClipboard).toHaveBeenCalledWith(0);
    fireEvent.keyDown(dialog, { key: 'w' });
    expect(state.toggleWrap).toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: 't' });
    expect(state.toast).toHaveBeenCalledWith('No template is ready', expect.any(String));
    fireEvent.keyDown(dialog, { key: 'x', ctrlKey: true });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(state.closeQuickLook).toHaveBeenCalledTimes(1);
  });

  it('the header buttons walk, copy, wrap and close; the dimmer closes', () => {
    render(<QuickLook />);
    fireEvent.click(screen.getByTestId('ql-next'));
    expect(state.walkQuickLook).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByTestId('ql-copy'));
    expect(state.copyClipToClipboard).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByTestId('ql-wrap'));
    expect(state.toggleWrap).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('ql-close'));
    fireEvent.click(screen.getByTestId('ql-dimmer'));
    expect(state.closeQuickLook).toHaveBeenCalledTimes(2);
  });

  it('wrap applies a class to the content pane', () => {
    state.quickLook.wrap = true;
    render(<QuickLook />);
    expect(screen.getByTestId('ql-content').className).toContain('wrap');
    expect(screen.getByTestId('ql-wrap')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Tab cycles the reader controls and never leaves the dialog', () => {
    render(<QuickLook />);
    const dialog = screen.getByTestId('quick-look');
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(buttons[buttons.length - 2]).toHaveFocus();
  });

  it('hovering a side column value lights its chips in the text and scrolls the first into view', () => {
    const scrolled = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrolled;
    render(<QuickLook />);
    const sideChip = screen
      .getByTestId('ql-group-ip')
      .querySelector('[data-key="ip|1.1.1.1"]') as HTMLElement;
    fireEvent.mouseEnter(sideChip);
    const lit = screen.getByTestId('ql-content').querySelectorAll('[data-key="ip|1.1.1.1"]');
    expect(lit).toHaveLength(2);
    expect(lit[0].className).toContain('lit');
    expect(scrolled).toHaveBeenCalled();
    fireEvent.mouseLeave(sideChip);
    expect(lit[0].className).not.toContain('lit');
  });

  it('e enters edit with the editor at reader size; Enter commits and Esc leaves edit only', () => {
    const { rerender } = render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'e' });
    expect(state.setEditing).toHaveBeenCalledWith(true);
    state.quickLook.editing = true;
    rerender(<QuickLook />);
    const editor = screen.getByTestId('clip-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(state.clips[0].content);
    expect(screen.queryByTestId('ql-content')).toBeNull();
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(state.closeQuickLook).not.toHaveBeenCalled();
    expect(state.setEditing).toHaveBeenLastCalledWith(false);
    fireEvent.change(editor, { target: { value: 'changed' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(state.updateClip).toHaveBeenCalledWith(0, { ...state.clips[0], content: 'changed' });
    fireEvent.click(screen.getByTestId('ql-edit'));
    expect(state.setEditing).toHaveBeenLastCalledWith(false);
  });

  it('committing an unchanged edit saves nothing', () => {
    const { rerender } = render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'e' });
    state.quickLook.editing = true;
    rerender(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('clip-editor'), { key: 'Enter' });
    expect(state.updateClip).not.toHaveBeenCalled();
    expect(state.setEditing).toHaveBeenLastCalledWith(false);
  });

  it('p with no matches pins nothing', () => {
    openOn('b');
    render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'p' });
    expect(state.togglePins).not.toHaveBeenCalled();
  });

  it('ignores the thumbnail load and reports the size once the full image is in', async () => {
    let resolveFull: (s: string) => void = () => {};
    api().getFullImage.mockReturnValueOnce(new Promise((r) => (resolveFull = r)));
    openOn('i');
    render(<QuickLook />);
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 200, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 150, configurable: true });
    fireEvent.load(img);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('640 x 480 px');
    await act(async () => {
      resolveFull('data:image/png;base64,full');
    });
    fireEvent.load(img);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('200 x 150 px');
  });

  it('e while already editing does nothing, and the editor keeps its own keys', () => {
    state.quickLook.editing = true;
    render(<QuickLook />);
    fireEvent.keyDown(screen.getByTestId('clip-editor'), { key: 'p' });
    expect(state.togglePins).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'e' });
    expect(state.setEditing).not.toHaveBeenCalledWith(true);
  });
}
