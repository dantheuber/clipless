import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HtmlClip } from './HtmlClip';
import { RtfClip } from './RtfClip';

vi.mock('../../../providers/clips', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../providers/clips')>();
  return {
    clipText: actual.clipText,
    useClipsPins: () => ({ isPinned: () => false, togglePins: vi.fn() }),
  };
});

vi.mock('../../../providers/scan', () => ({
  useScanIndex: () => ({ slotFor: () => 1 }),
}));

afterEach(cleanup);

describe('HtmlClip', () => {
  it('renders an html tag and the extracted text, never the markup', () => {
    render(
      <HtmlClip
        clip={{ id: 'c1', type: 'html', content: '<p>Hello</p>', text: 'Hello' }}
        scan={null}
      />
    );
    expect(screen.getByText('html')).toBeInTheDocument();
    expect(screen.getByTestId('clip-line').textContent).toBe('htmlHello');
  });

  it('falls back to the content for a clip captured before extraction existed', () => {
    render(<HtmlClip clip={{ id: 'c1', type: 'html', content: '<p>Old</p>' }} scan={null} />);
    expect(screen.getByTestId('clip-line').textContent).toContain('<p>Old</p>');
  });
});

describe('RtfClip', () => {
  it('renders an rtf tag and the extracted text', () => {
    render(
      <RtfClip clip={{ id: 'c1', type: 'rtf', content: '{\\rtf1 Hi}', text: 'Hi' }} scan={null} />
    );
    expect(screen.getByText('rtf')).toBeInTheDocument();
    expect(screen.getByTestId('clip-line').textContent).toBe('rtfHi');
  });
});
