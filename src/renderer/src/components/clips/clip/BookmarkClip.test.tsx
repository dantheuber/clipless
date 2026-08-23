import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BookmarkClip } from './BookmarkClip';

vi.mock('../../../providers/clips', () => ({
  useClipsPins: () => ({ isPinned: () => false, togglePins: vi.fn() }),
}));

vi.mock('../../../providers/scan', () => ({
  useScanIndex: () => ({ slotFor: () => 4 }),
}));

afterEach(cleanup);

describe('BookmarkClip', () => {
  it('renders a link tag, the title plain and the url', () => {
    render(
      <BookmarkClip
        clip={{
          id: 'c1',
          type: 'bookmark',
          content: '',
          title: 'Example',
          url: 'https://example.com',
        }}
        scan={null}
      />
    );
    expect(screen.getByText('link')).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByTestId('clip-line').textContent).toContain('https://example.com');
  });

  it('renders Untitled for a missing title and falls back to content for the url', () => {
    render(
      <BookmarkClip
        clip={{ id: 'c1', type: 'bookmark', content: 'https://c.example' }}
        scan={null}
      />
    );
    expect(screen.getByText('Untitled')).toBeInTheDocument();
    expect(screen.getByTestId('clip-line').textContent).toContain('https://c.example');
  });

  it('puts a chip on the url when a term matched it in the scanned title plus url text', () => {
    const url = 'https://example.com';
    const text = `Example\n${url}`;
    render(
      <BookmarkClip
        clip={{ id: 'c1', type: 'bookmark', content: '', title: 'Example', url }}
        scan={{
          matches: [
            { group: 'url', value: url, start: text.indexOf(url), end: text.length, termId: 't' },
          ],
          groups: ['url'],
          errors: [],
          large: false,
        }}
      />
    );
    expect(screen.getByText(url).closest('[data-key]')).toHaveAttribute('data-key', `url|${url}`);
  });
});
