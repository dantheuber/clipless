import {
  act,
  cleanup,
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

export function registerQuickLookFormatCases({ state, api, openOn }: QuickLookCaseContext) {
  it('html: text view by default, source view without chips, rendered view in a sandboxed frame', async () => {
    openOn('h');
    const { rerender } = render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('html');
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('ql-view-source'));
    expect(state.setView).toHaveBeenCalledWith('source');
    state.quickLook.view = 'source';
    rerender(<QuickLook />);
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(0);
    expect(screen.getByTestId('ql-content').querySelector('.tok-tag')).not.toBeNull();
    expect(screen.getByTestId('ql-side')).toHaveTextContent('The source view has no chips');
    state.quickLook.view = 'rendered';
    rerender(<QuickLook />);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('Sanitising');
    await act(async () => {});
    expect(screen.getByTestId('ql-frame')).toHaveAttribute('sandbox', '');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('removed: script x2');
  });

  it('rtf offers text and source only; a bookmark shows a link tag on two lines', () => {
    openOn('r');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-view-source')).toBeInTheDocument();
    expect(screen.queryByTestId('ql-view-rendered')).toBeNull();
    cleanup();
    openOn('b');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('link');
    expect(
      screen.getByTestId('ql-content').querySelectorAll('[data-testid="ql-content"] > div')
    ).toHaveLength(2);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('No search terms match this clip.');
  });

  it('image: fitted viewer, details in the side column, edit and wrap greyed, w ignored', async () => {
    openOn('i');
    render(<QuickLook />);
    await act(async () => {});
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,full');
    expect(screen.getByTestId('ql-header')).toHaveTextContent('png');
    expect(screen.getByTestId('ql-header')).toHaveTextContent('640 x 480, 2 KB');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('640 x 480 px');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('image store');
    expect(screen.getByTestId('ql-edit')).toBeDisabled();
    expect(screen.getByTestId('ql-wrap')).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId('quick-look'), { key: 'w' });
    expect(state.toggleWrap).not.toHaveBeenCalled();
    Object.defineProperty(img, 'naturalWidth', { value: 1280 });
    Object.defineProperty(img, 'naturalHeight', { value: 720 });
    fireEvent.load(img);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('1280 x 720 px');
  });

  it('image without an image store entry or dimensions shows what it knows', async () => {
    state.clips = [{ id: 'i2', type: 'image', content: 'data:image/gif;base64,abcd' }];
    openOn('i2');
    render(<QuickLook />);
    await act(async () => {});
    expect(window.api.getFullImage).not.toHaveBeenCalled();
    expect(screen.getByTestId('ql-side')).toHaveTextContent('size unknown');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('stored inline');
    expect(screen.getByTestId('ql-header')).toHaveTextContent('gif');
  });

  it('logs when the full image fails to load and keeps the thumbnail', async () => {
    api().getFullImage.mockRejectedValueOnce(new Error('gone'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    openOn('i');
    render(<QuickLook />);
    await act(async () => {});
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,thumb');
    expect(errSpy).toHaveBeenCalledWith('Failed to load full image:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('says the clip is still scanning while a large scan is pending', () => {
    state.pendingScan = true;
    render(<QuickLook />);
    expect(screen.getByTestId('ql-side')).toHaveTextContent('Scanning this clip');
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(0);
    expect(screen.getByTestId('ql-pin-all')).toBeDisabled();
  });

  it('folds the side column under the content in a narrow window and opens it on click', () => {
    state.narrow = true;
    render(<QuickLook />);
    const side = screen.getByTestId('ql-side');
    expect(side.querySelector('[role="button"]')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('ql-group-ip')).toBeNull();
    fireEvent.click(side.querySelector('[role="button"]') as HTMLElement);
    expect(screen.getByTestId('ql-group-ip')).toBeInTheDocument();
  });

  it('drops the hints and the not-ready pills in a short window', () => {
    state.short = true;
    render(<QuickLook />);
    expect(screen.getByTestId('ql-footer')).not.toHaveTextContent('pin all');
    expect(screen.queryByTestId('template-pills')).toBeNull();
  });

  it('the prev button walks up from a later clip', () => {
    openOn('j');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-prev')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('ql-prev'));
    expect(state.walkQuickLook).toHaveBeenCalledWith(-1);
  });

  it('rtf source view has no chips and no syntax colouring', () => {
    openOn('r');
    state.quickLook.view = 'source';
    render(<QuickLook />);
    expect(screen.getByTestId('ql-content').querySelectorAll('[data-key]')).toHaveLength(0);
    expect(screen.getByTestId('ql-content').querySelector('[class^="tok-"]')).toBeNull();
  });

  it('lists what the sanitiser removed, or nothing', async () => {
    openOn('h');
    state.quickLook.view = 'rendered';
    api().htmlSanitize.mockResolvedValue({ html: '<p>x</p>', removed: {} });
    render(<QuickLook />);
    await act(async () => {});
    expect(screen.getByTestId('ql-side')).toHaveTextContent('nothing removed');
    cleanup();
    api().htmlSanitize.mockResolvedValue({ html: '<p>x</p>', removed: { img: 1 } });
    render(<QuickLook />);
    await act(async () => {});
    expect(screen.getByTestId('ql-side')).toHaveTextContent('removed: img');
  });

  it('an image with no data url format says image and unknown', async () => {
    state.clips = [{ id: 'i3', type: 'image', content: 'img3', imageId: 'img3' }];
    api().getFullImage.mockResolvedValue(null);
    openOn('i3');
    render(<QuickLook />);
    await act(async () => {});
    expect(screen.getByTestId('ql-header')).toHaveTextContent('image');
    expect(screen.getByTestId('ql-side')).toHaveTextContent('format unknown');
    const img = screen.getByTestId('ql-image').querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('img3');
  });

  it('hovering a value with no chip in the text is harmless, as is a pane without scrollIntoView', () => {
    const original = HTMLElement.prototype.scrollIntoView;
    delete (HTMLElement.prototype as { scrollIntoView?: typeof original }).scrollIntoView;
    render(<QuickLook />);
    const sideChip = screen
      .getByTestId('ql-group-ip')
      .querySelector('[data-key="ip|2.2.2.2"]') as HTMLElement;
    fireEvent.mouseEnter(sideChip);
    expect(
      screen.getByTestId('ql-content').querySelector('[data-key="ip|2.2.2.2"]')?.className
    ).toContain('lit');
    HTMLElement.prototype.scrollIntoView = original;
  });

  it('textMeta counts lines and bytes', () => {
    expect(textMeta('')).toBe('0 lines · 0 B');
    expect(textMeta('a')).toBe('1 line · 1 B');
    expect(textMeta('é\nb')).toBe('2 lines · 4 B');
  });
}
