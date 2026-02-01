import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookmarkClip } from './BookmarkClip';

vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({ isLight: false }),
}));

vi.mock('./Clip.module.css', () => ({
  default: { typeLabel: 'typeLabel', light: 'light' },
}));

describe('BookmarkClip', () => {
  it('renders bookmark label with title and url', () => {
    const { container } = render(
      <BookmarkClip
        clip={{ type: 'bookmark', content: '', title: 'Example', url: 'https://example.com' }}
      />
    );
    expect(screen.getByText('Bookmark:')).toBeInTheDocument();
    expect(container.textContent).toContain('Example');
    expect(container.textContent).toContain('https://example.com');
  });

  it('renders Untitled for missing title', () => {
    const { container } = render(
      <BookmarkClip
        clip={{ type: 'bookmark', content: '', url: 'https://example.com' }}
      />
    );
    expect(container.textContent).toContain('Untitled');
  });
});
