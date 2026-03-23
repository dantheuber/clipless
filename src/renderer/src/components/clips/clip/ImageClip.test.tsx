import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { ImageClip } from './ImageClip';

const { themeState } = vi.hoisted(() => ({
  themeState: { isLight: false },
}));

vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({ isLight: themeState.isLight }),
}));

vi.mock('./Clip.module.css', () => ({
  default: {
    imagePreviewContainer: 'imagePreviewContainer',
    imagePreview: 'imagePreview',
    imagePopover: 'imagePopover',
    imagePopoverVisible: 'imagePopoverVisible',
    popoverImage: 'popoverImage',
    imageInfo: 'imageInfo',
    imageFilename: 'imageFilename',
    imageSize: 'imageSize',
    light: 'light',
  },
}));

describe('ImageClip', () => {
  afterEach(() => {
    cleanup();
    themeState.isLight = false;
  });

  it('renders image with correct src', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
  });

  it('displays image format', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const pngElements = screen.getAllByText(/PNG/);
    expect(pngElements.length).toBeGreaterThan(0);
  });

  it('displays approximate file size', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const kbElements = screen.getAllByText(/KB/);
    expect(kbElements.length).toBeGreaterThan(0);
  });

  it('displays Unknown format for non-data-url content', () => {
    render(<ImageClip clip={{ type: 'image', content: 'not-a-data-url' }} />);
    expect(screen.getByText(/Unknown format/)).toBeInTheDocument();
  });

  it('shows popover on mouse enter and hides on mouse leave', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 50,
      right: 150,
      bottom: 200,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    // Popover should not exist before hover
    expect(document.body.querySelector('.imagePopoverVisible')).toBeNull();

    fireEvent.mouseEnter(img);

    // Popover should be portaled to body
    const popover = document.body.querySelector('.imagePopoverVisible');
    expect(popover).toBeTruthy();

    fireEvent.mouseLeave(img);

    // Popover should be removed
    expect(document.body.querySelector('.imagePopoverVisible')).toBeNull();
  });

  it('positions popover to the left when right edge exceeded', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 800,
      right: 1180,
      bottom: 200,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    fireEvent.mouseEnter(img);
    const popover = document.body.querySelector('.imagePopoverVisible') as HTMLElement;
    expect(popover?.style.left).toBeTruthy();
  });

  it('clamps popover to top edge', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 10,
      left: 50,
      right: 150,
      bottom: 110,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    fireEvent.mouseEnter(img);
    const popover = document.body.querySelector('.imagePopoverVisible') as HTMLElement;
    expect(popover?.style.top).toBe('16px');
  });

  it('clamps popover to bottom edge', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 700,
      left: 50,
      right: 150,
      bottom: 800,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    fireEvent.mouseEnter(img);
    const popover = document.body.querySelector('.imagePopoverVisible') as HTMLElement;
    expect(popover?.style.top).toBe(`${800 - 320 - 16}px`);
  });

  it('clamps popover to left edge when positioned left goes negative', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 5,
      right: 1190,
      bottom: 200,
      width: 1185,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    fireEvent.mouseEnter(img);
    const popover = document.body.querySelector('.imagePopoverVisible') as HTMLElement;
    expect(popover?.style.left).toBe('16px');
  });

  it('handles image error and shows fallback text', () => {
    themeState.isLight = false;
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    fireEvent.error(img);

    // Image should be replaced by fallback text (React state, no DOM manipulation)
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Invalid image data')).toBeInTheDocument();
  });

  it('uses light theme color in error fallback', () => {
    themeState.isLight = true;
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    fireEvent.error(img);

    const fallback = screen.getByText('Invalid image data');
    expect(fallback.style.color).toBe('rgb(102, 102, 102)');
  });

  it('shows thumbnailDataUrl as img src when available', () => {
    render(
      <ImageClip
        clip={{
          type: 'image',
          content: 'data:image/png;base64,fullcontent',
          thumbnailDataUrl: 'data:image/png;base64,thumbnail',
          imageId: 'img-123',
        }}
      />
    );
    const img = screen.getAllByRole('img')[0];
    expect(img).toHaveAttribute('src', 'data:image/png;base64,thumbnail');
  });

  it('calls getFullImage on hover when clip has imageId', async () => {
    const mockGetFullImage = vi.fn().mockResolvedValue('data:image/png;base64,fullimage');
    window.api = { getFullImage: mockGetFullImage } as unknown as typeof window.api;

    render(
      <ImageClip
        clip={{
          type: 'image',
          content: 'data:image/png;base64,fallback',
          thumbnailDataUrl: 'data:image/png;base64,thumb',
          imageId: 'img-456',
        }}
      />
    );
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 50,
      right: 150,
      bottom: 200,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    await act(async () => {
      fireEvent.mouseEnter(img);
    });

    await waitFor(() => {
      expect(mockGetFullImage).toHaveBeenCalledWith('img-456');
    });

    // Popover should show the full image
    const popover = document.body.querySelector('.imagePopoverVisible');
    expect(popover).toBeTruthy();
    const popoverImg = popover?.querySelector('img');
    expect(popoverImg).toHaveAttribute('src', 'data:image/png;base64,fullimage');
  });

  it('returns cached image without calling getFullImage again', async () => {
    const mockGetFullImage = vi.fn().mockResolvedValue('data:image/png;base64,fullimage');
    window.api = { getFullImage: mockGetFullImage } as unknown as typeof window.api;

    const clip = {
      type: 'image' as const,
      content: 'data:image/png;base64,fallback',
      thumbnailDataUrl: 'data:image/png;base64,thumb',
      imageId: 'img-789',
    };

    const { unmount } = render(<ImageClip clip={clip} />);
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 50,
      right: 150,
      bottom: 200,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    // First hover - should call getFullImage
    await act(async () => {
      fireEvent.mouseEnter(img);
    });

    await waitFor(() => {
      expect(mockGetFullImage).toHaveBeenCalledTimes(1);
    });

    // Leave and re-enter
    fireEvent.mouseLeave(img);

    mockGetFullImage.mockClear();

    await act(async () => {
      fireEvent.mouseEnter(img);
    });

    // Should not call getFullImage again since image is cached
    expect(mockGetFullImage).not.toHaveBeenCalled();

    // Popover should still show the full image from cache
    const popover = document.body.querySelector('.imagePopoverVisible');
    const popoverImg = popover?.querySelector('img');
    expect(popoverImg).toHaveAttribute('src', 'data:image/png;base64,fullimage');

    unmount();
  });

  it('shows displaySrc in popover when getFullImage returns null', async () => {
    const mockGetFullImage = vi.fn().mockResolvedValue(null);
    window.api = { getFullImage: mockGetFullImage } as unknown as typeof window.api;

    render(
      <ImageClip
        clip={{
          type: 'image',
          content: 'data:image/png;base64,fallback',
          thumbnailDataUrl: 'data:image/png;base64,thumb',
          imageId: 'img-null',
        }}
      />
    );
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 50,
      right: 150,
      bottom: 200,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    await act(async () => {
      fireEvent.mouseEnter(img);
    });

    await waitFor(() => {
      expect(mockGetFullImage).toHaveBeenCalledWith('img-null');
    });

    // Popover should fall back to displaySrc (thumbnailDataUrl)
    const popover = document.body.querySelector('.imagePopoverVisible');
    const popoverImg = popover?.querySelector('img');
    expect(popoverImg).toHaveAttribute('src', 'data:image/png;base64,thumb');
  });

  it('handles getFullImage error gracefully', async () => {
    const mockGetFullImage = vi.fn().mockRejectedValue(new Error('IPC error'));
    window.api = { getFullImage: mockGetFullImage } as unknown as typeof window.api;

    render(
      <ImageClip
        clip={{
          type: 'image',
          content: 'data:image/png;base64,fallback',
          imageId: 'img-err',
        }}
      />
    );
    const img = screen.getAllByRole('img')[0];

    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 50,
      right: 150,
      bottom: 200,
      width: 100,
      height: 100,
    });

    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    await act(async () => {
      fireEvent.mouseEnter(img);
    });

    await waitFor(() => {
      expect(mockGetFullImage).toHaveBeenCalledWith('img-err');
    });

    // Should not crash; popover should still be visible
    const popover = document.body.querySelector('.imagePopoverVisible');
    expect(popover).toBeTruthy();
  });

  it('uses content for format detection when no thumbnailDataUrl', () => {
    render(
      <ImageClip
        clip={{
          type: 'image',
          content: 'data:image/jpeg;base64,abc123',
        }}
      />
    );
    const jpegElements = screen.getAllByText(/JPEG/);
    expect(jpegElements.length).toBeGreaterThan(0);
  });

  it('uses thumbnailDataUrl for format detection when available', () => {
    render(
      <ImageClip
        clip={{
          type: 'image',
          content: 'data:image/jpeg;base64,fullcontent',
          thumbnailDataUrl: 'data:image/webp;base64,thumb',
          imageId: 'img-fmt',
        }}
      />
    );
    const webpElements = screen.getAllByText(/WEBP/);
    expect(webpElements.length).toBeGreaterThan(0);
  });
});
