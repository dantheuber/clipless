import type { Template } from './types';

const RESERVED_TOKEN = /^c\d+$/;

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

export function generateTextFromTemplate(
  template: Pick<Template, 'content'>,
  clipContents: string[],
  captures?: Record<string, string>
): string {
  let result = template.content;

  if (captures) {
    result = result.replace(/\{(\w+)\}/g, (match, tokenName) => {
      if (RESERVED_TOKEN.test(tokenName)) return match; // skip positional
      return tokenName in captures ? captures[tokenName] : match;
    });
  }

  result = result.replace(/\{c(\d+)\}/g, (match, clipIndex) => {
    const index = parseInt(clipIndex) - 1; // Convert to 0-based index
    return index >= 0 && index < clipContents.length ? clipContents[index] : match;
  });

  return result;
}
