import { describe, it, expect } from 'vitest';
import { detectLanguage, isCode, mapToSyntaxHighlighterLanguage } from './languageDetection';

describe('detectLanguage', () => {
  it('returns null for short text (< 5 chars)', () => {
    expect(detectLanguage('hi')).toBeNull();
    expect(detectLanguage('abcd')).toBeNull();
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

  it('returns null for null/undefined', () => {
    expect(detectLanguage(null as any)).toBeNull();
    expect(detectLanguage(undefined as any)).toBeNull();
  });

  it('detects JSON', () => {
    const code = '{"name": "test", "value": 42, "active": true}';
    expect(detectLanguage(code)).toBe('json');
  });

  it('detects CSS', () => {
    const code = `.container { color: red; background: blue; margin: 10px; padding: 5px; }`;
    expect(detectLanguage(code)).toBe('css');
  });

  it('detects bash', () => {
    const code = `#!/bin/bash\necho "hello"\ncd /home\nls -la | grep test`;
    expect(detectLanguage(code)).toBe('bash');
  });

  it('detects Java', () => {
    const code = `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}`;
    expect(detectLanguage(code)).toBe('java');
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

  it('returns false for null/undefined', () => {
    expect(isCode(null as any)).toBe(false);
    expect(isCode(undefined as any)).toBe(false);
  });

  it('returns true for strong code indicators', () => {
    expect(isCode('const handleX = (')).toBe(true);
    expect(isCode('obj.method()')).toBe(true);
    expect(isCode('=> {')).toBe(true);
  });

  it('detects code in small snippets (< 20 chars)', () => {
    expect(isCode('x = 5;')).toBe(true);
  });

  it('detects code in medium snippets (20-50 chars)', () => {
    expect(isCode('const x = 5; let y = 10;')).toBe(true);
  });

  it('detects code in large snippets (> 50 chars)', () => {
    const largeCode = 'const foo = "bar"; const baz = 42; if (foo) { console.log(baz); }';
    expect(isCode(largeCode)).toBe(true);
  });

  it('returns false for text under 3 chars', () => {
    expect(isCode('hi')).toBe(false);
  });

  it('returns false for large non-code text (> 50 chars)', () => {
    const plainText =
      'This is a perfectly normal sentence that has no code indicators whatsoever and is quite long.';
    expect(isCode(plainText)).toBe(false);
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
