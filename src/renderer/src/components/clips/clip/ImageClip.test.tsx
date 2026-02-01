import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageClip } from './ImageClip';

vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({ isLight: false }),
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
});
