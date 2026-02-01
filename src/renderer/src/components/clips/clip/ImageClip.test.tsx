import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
  });
  it('renders image with correct src', () => {
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'data:image/png;base64,abc123');
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

  it('handles mouse enter and positions popover', () => {
    const { container } = render(
      <ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />
    );
    const img = screen.getAllByRole('img')[0];

    // Mock getBoundingClientRect
    img.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 50,
      right: 150,
      bottom: 200,
      width: 100,
      height: 100,
    });

    // Mock viewport
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    fireEvent.mouseEnter(img);

    // Popover should have been positioned
    const popover = container.querySelector('.imagePopover');
    expect(popover).toBeTruthy();
  });

  it('positions popover to the left when right edge exceeded', () => {
    const { container } = render(
      <ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />
    );
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
    const popover = container.querySelector('.imagePopover') as HTMLElement;
    expect(popover?.style.left).toBeTruthy();
  });

  it('clamps popover to top edge', () => {
    const { container } = render(
      <ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />
    );
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
    const popover = container.querySelector('.imagePopover') as HTMLElement;
    expect(popover?.style.top).toBe('16px');
  });

  it('clamps popover to bottom edge', () => {
    const { container } = render(
      <ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />
    );
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
    const popover = container.querySelector('.imagePopover') as HTMLElement;
    // Should be clamped to viewport - popoverHeight - 16
    expect(popover?.style.top).toBe(`${800 - 320 - 16}px`);
  });

  it('clamps popover to left edge when positioned left goes negative', () => {
    const { container } = render(
      <ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />
    );
    const img = screen.getAllByRole('img')[0];

    // right edge exceeds viewport width, left edge is very close to 0
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
    const popover = container.querySelector('.imagePopover') as HTMLElement;
    expect(popover?.style.left).toBe('16px');
  });

  it('handles image error and shows fallback text', () => {
    themeState.isLight = false;
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    // Mock parentNode
    const parent = document.createElement('div');
    Object.defineProperty(img, 'parentNode', { value: parent, writable: true });

    fireEvent.error(img);

    expect(img.style.display).toBe('none');
    expect(parent.querySelector('span')?.textContent).toBe('Invalid image data');
  });

  it('uses light theme color in error fallback', () => {
    themeState.isLight = true;
    render(<ImageClip clip={{ type: 'image', content: 'data:image/png;base64,abc123' }} />);
    const img = screen.getAllByRole('img')[0];

    const parent = document.createElement('div');
    Object.defineProperty(img, 'parentNode', { value: parent, writable: true });

    fireEvent.error(img);

    const fallback = parent.querySelector('span');
    expect(fallback?.style.color).toBe('rgb(102, 102, 102)');
  });
});
