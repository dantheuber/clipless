import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImageClip } from './ImageClip';
import { formatBytes, imageBytes, imageFormat, imageMeta } from './imageMeta';

afterEach(cleanup);

describe('ImageClip', () => {
  it('renders the thumbnail when present, otherwise the content', () => {
    render(
      <ImageClip
        clip={{
          id: 'c1',
          type: 'image',
          content: 'img-id',
          imageId: 'img-id',
          thumbnailDataUrl: 'data:image/png;base64,thumb',
        }}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,thumb');
    cleanup();
    render(
      <ImageClip clip={{ id: 'c1', type: 'image', content: 'data:image/jpeg;base64,abc123' }} />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,abc123');
    expect(screen.getByText('jpeg')).toBeInTheDocument();
  });

  it('shows the format tag, dimensions and size recorded at capture', () => {
    render(
      <ImageClip
        clip={{
          id: 'c1',
          type: 'image',
          content: 'img-id',
          imageId: 'img-id',
          thumbnailDataUrl: 'data:image/png;base64,thumb',
          imageWidth: 1280,
          imageHeight: 720,
          imageBytes: 412 * 1024,
        }}
      />
    );
    expect(screen.getByText('png')).toBeInTheDocument();
    expect(screen.getByText('1280 x 720, 412 KB')).toBeInTheDocument();
  });

  it('shows a generic tag and an estimated size for a clip with no recorded metadata', () => {
    render(<ImageClip clip={{ id: 'c1', type: 'image', content: 'not-a-data-url' }} />);
    expect(screen.getByText('image')).toBeInTheDocument();
    expect(screen.getByText('11 B')).toBeInTheDocument();
  });

  it('shows a fallback when the image fails to load', () => {
    render(<ImageClip clip={{ id: 'c1', type: 'image', content: 'data:image/png;base64,bad' }} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Invalid image data')).toBeInTheDocument();
  });

  it('clears the error when the source changes', () => {
    const { rerender } = render(
      <ImageClip clip={{ id: 'c1', type: 'image', content: 'data:image/png;base64,bad' }} />
    );
    fireEvent.error(screen.getByRole('img'));
    rerender(
      <ImageClip clip={{ id: 'c1', type: 'image', content: 'data:image/png;base64,good' }} />
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('image helpers', () => {
  it('formats bytes at three scales', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(412 * 1024)).toBe('412 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });

  it('reads the format from a data url only', () => {
    expect(imageFormat('data:image/webp;base64,x')).toBe('WEBP');
    expect(imageFormat('img-id')).toBeNull();
  });

  it('uses the recorded byte count over the estimate', () => {
    expect(
      imageBytes({
        id: 'c',
        type: 'image',
        content: 'data:image/png;base64,abcdefgh',
        imageBytes: 99,
      })
    ).toBe(99);
    expect(imageBytes({ id: 'c', type: 'image', content: 'data:image/png;base64,abcdefgh' })).toBe(
      6
    );
    expect(imageMeta({ id: 'c', type: 'image', content: 'xxxx' })).toBe('3 B');
  });
});
