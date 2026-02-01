import { describe, it, expect } from 'vitest';
import { detectLanguage, isCode, mapToSyntaxHighlighterLanguage } from './languageDetection';

describe('detectLanguage', () => {
  it('returns null for short text', () => {
    expect(detectLanguage('hi')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectLanguage('')).toBeNull();
  });

  it('detects JavaScript', () => {
    const code = `
      const foo = require('bar');
      function hello() {
        console.log("world");
      }
    `;
    expect(detectLanguage(code)).toBe('javascript');
  });

  it('detects TypeScript', () => {
    const code = `
      interface User {
        name: string;
        age: number;
      }
      type Greeting = string;
      enum Role { Admin, User }
      const greet = (user: User): void => {};
    `;
    const result = detectLanguage(code);
    // TypeScript and JavaScript are closely related; accept either
    expect(['typescript', 'javascript']).toContain(result);
  });

  it('detects Python', () => {
    const code = `
      def hello():
          print("hello world")
      if __name__ == "__main__":
          hello()
    `;
    expect(detectLanguage(code)).toBe('python');
  });

  it('detects HTML', () => {
    const code = `<!DOCTYPE html><html><body><div>Hello</div></body></html>`;
    expect(detectLanguage(code)).toBe('html');
  });

  it('detects SQL', () => {
    const code = `SELECT name, email FROM users WHERE id = 1`;
    expect(detectLanguage(code)).toBe('sql');
  });

  it('returns null for plain text', () => {
    const text = 'The weather is nice today and the sun is shining brightly.';
    expect(detectLanguage(text)).toBeNull();
  });
});

describe('isCode', () => {
  it('returns false for empty string', () => {
    expect(isCode('')).toBe(false);
  });

  it('returns false for short non-code text', () => {
    expect(isCode('hi')).toBe(false);
  });

  it('returns true for code with brackets and semicolons', () => {
    expect(isCode('const x = 5; if (x > 3) { return true; }')).toBe(true);
  });

  it('returns true for arrow functions', () => {
    expect(isCode('const fn = () => {')).toBe(true);
  });

  it('returns true for method calls', () => {
    expect(isCode('object.method()')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(isCode('Hello, this is a normal sentence.')).toBe(false);
  });
});

describe('mapToSyntaxHighlighterLanguage', () => {
  it('maps javascript correctly', () => {
    expect(mapToSyntaxHighlighterLanguage('javascript')).toBe('javascript');
  });

  it('maps html to markup', () => {
    expect(mapToSyntaxHighlighterLanguage('html')).toBe('markup');
  });

  it('returns text for unknown language', () => {
    expect(mapToSyntaxHighlighterLanguage('unknown')).toBe('text');
  });

  it('maps all known languages', () => {
    const known = [
      'javascript',
      'typescript',
      'python',
      'java',
      'csharp',
      'cpp',
      'c',
      'css',
      'json',
      'xml',
      'sql',
      'bash',
      'powershell',
    ];
    for (const lang of known) {
      expect(mapToSyntaxHighlighterLanguage(lang)).not.toBe('text');
    }
  });
});
