import type { Template } from './types';

/**
 * The template engine, shared by the main process and both windows. Tokens are {name};
 * {c1}, {c2}, ... are positional and mean row 1, row 2, ... (spec 16.2). The token
 * regex is \w+, so templates never parse the {a|b} pipe form tools accept.
 */

const RESERVED_TOKEN = /^c\d+$/;

/**
 * Extract template tokens into positional ({c1}) and named ({groupName}) categories.
 */
export function extractTemplateTokens(content: string): {
  positional: string[];
  named: string[];
} {
  const positional: string[] = [];
  const named: string[] = [];
  const tokenRegex = /\{(\w+)\}/g;
  let match;

  while ((match = tokenRegex.exec(content)) !== null) {
    const token = match[1];
    if (RESERVED_TOKEN.test(token)) {
      if (!positional.includes(token)) positional.push(token);
    } else {
      if (!named.includes(token)) named.push(token);
    }
  }

  return { positional, named };
}

/**
 * Generate text from template using clipboard contents and optional named captures.
 */
export function generateTextFromTemplate(
  template: Pick<Template, 'content'>,
  clipContents: string[],
  captures?: Record<string, string>
): string {
  let result = template.content;

  // First pass: replace named capture group tokens (skip positional {c\d+} tokens)
  if (captures) {
    result = result.replace(/\{(\w+)\}/g, (match, tokenName) => {
      if (RESERVED_TOKEN.test(tokenName)) return match; // skip positional
      return tokenName in captures ? captures[tokenName] : match;
    });
  }

  // Second pass: replace positional {c#} tokens with clip contents
  result = result.replace(/\{c(\d+)\}/g, (match, clipIndex) => {
    const index = parseInt(clipIndex) - 1; // Convert to 0-based index
    return index >= 0 && index < clipContents.length ? clipContents[index] : match;
  });

  return result;
}
