import { Parser } from 'htmlparser2';

const SKIPPED = new Set(['script', 'style', 'template', 'noscript', 'head']);

const BLOCK = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'tfoot',
  'thead',
  'tr',
  'ul',
]);

export function htmlToText(html: string): string {
  const parts: string[] = []; // a parser walk, not a regex strip: entity text, script bodies and style rules never reach the scanner
  let skipDepth = 0;
  let preDepth = 0;
  let cellsInRow = 0;

  const parser = new Parser(
    {
      onopentag(name) {
        if (SKIPPED.has(name)) {
          skipDepth++;
          return;
        }
        if (skipDepth > 0) return;
        if (name === 'br') {
          parts.push('\n');
        } else if (name === 'td' || name === 'th') {
          if (cellsInRow > 0) parts.push('\t');
          cellsInRow++;
        } else if (BLOCK.has(name)) {
          if (name === 'tr') cellsInRow = 0;
          if (name === 'pre') preDepth++;
          parts.push('\n');
        }
      },
      ontext(text) {
        if (skipDepth > 0) return;
        parts.push(preDepth > 0 ? text : text.replace(/[\r\n]+/g, ' ')); // source line breaks are whitespace except inside pre, where they are lines
      },
      onclosetag(name) {
        if (SKIPPED.has(name)) {
          skipDepth--; // cannot go negative: htmlparser2 never reports a closer without an opener
          return;
        }
        if (skipDepth > 0) return;
        if (name === 'pre' && preDepth > 0) preDepth--;
        if (BLOCK.has(name)) parts.push('\n');
      },
    },
    { decodeEntities: true, lowerCaseTags: true }
  );
  parser.write(html);
  parser.end();

  return parts
    .join('')
    .split('\n')
    .map((line) =>
      line
        .replace(/[^\S\t]+/g, ' ')
        .replace(/ ?\t ?/g, '\t')
        .trim()
    )
    .filter((line) => line.length > 0)
    .join('\n');
}
