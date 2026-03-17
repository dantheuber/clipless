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
