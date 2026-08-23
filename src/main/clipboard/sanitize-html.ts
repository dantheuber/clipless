import sanitize from 'sanitize-html';
import { Parser } from 'htmlparser2';

/**
 * The rendered view of an HTML clip (spec 16.1 rule 6). Runs in the main process, only
 * when the user switches to the rendered view, never at capture. The renderer puts the
 * returned string into a sandboxed iframe's srcdoc with the CSP meta prepended and nothing
 * else: the untrusted source never reaches the live document.
 *
 * Formatting tags only; script, style, iframe, object, embed, link, meta, base, svg, math,
 * form and every input, video, audio and img are removed. An image leaves a
 * "[image removed]" marker; unknown tags are unwrapped with their text kept. Every
 * attribute is dropped except title and, on a, an href that starts with http:, https: or
 * mailto:.
 */

export const ALLOWED_TAGS: readonly string[] = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'b',
  'i',
  'em',
  'strong',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'span',
  'div',
  'a',
];

/**
 * Tags whose text content goes with them. sanitize-html's default covers script and style;
 * the rest hold fallback text or markup that means nothing without the element.
 */
const NON_TEXT_TAGS = [
  'script',
  'style',
  'textarea',
  'option',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'noscript',
  'template',
  'head',
  'title',
  'video',
  'audio',
];

const SAFE_HREF = /^(https?|mailto):/i;

export const IMAGE_REMOVED_TEXT = '[image removed]';

export interface SanitizeResult {
  html: string;
  /** Removed tag names and dropped attribute names, each with a count, for the side column */
  removed: Record<string, number>;
}

function hrefAllowed(href: string | undefined): href is string {
  return typeof href === 'string' && SAFE_HREF.test(href.trim());
}

/**
 * First pass: count what the sanitiser will drop, over the same string it sanitises.
 */
function countRemoved(html: string): Record<string, number> {
  const removed: Record<string, number> = {};
  const allowed = new Set(ALLOWED_TAGS);
  const bump = (name: string): void => {
    removed[name] = (removed[name] ?? 0) + 1;
  };
  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (!allowed.has(name)) bump(name);
        for (const [attr, value] of Object.entries(attribs)) {
          if (attr === 'title') continue;
          if (name === 'a' && attr === 'href' && hrefAllowed(value)) continue;
          bump(attr);
        }
      },
    },
    { lowerCaseTags: true, lowerCaseAttributeNames: true }
  );
  parser.write(html);
  parser.end();
  return removed;
}

export function sanitizeHtml(html: string): SanitizeResult {
  const removed = countRemoved(html);
  const clean = sanitize(html, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: { '*': ['title'], a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: NON_TEXT_TAGS,
    parseStyleAttributes: false,
    transformTags: {
      img: () => ({ tagName: 'span', attribs: {}, text: IMAGE_REMOVED_TEXT }),
      a: (tagName, attribs) => {
        const kept: Record<string, string> = {};
        // A relative or protocol-relative href has no scheme to check; drop it too
        if (hrefAllowed(attribs.href)) kept.href = attribs.href;
        if (typeof attribs.title === 'string') kept.title = attribs.title;
        return { tagName, attribs: kept };
      },
    },
  });
  return { html: clean, removed };
}
