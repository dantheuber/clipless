import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectLanguage,
  isCode,
  mapToSyntaxHighlighterLanguage,
  clearDetectionCache,
  getDetectionCacheSize,
} from './languageDetection';

// Clear cache between tests to avoid cross-test interference
beforeEach(() => {
  clearDetectionCache();
});

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(detectLanguage(null as any)).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isCode(null as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe('text length threshold', () => {
  it('detectLanguage returns null for text over 10000 chars', () => {
    const longCode = 'const x = 1;\n'.repeat(1000); // ~13000 chars
    expect(longCode.length).toBeGreaterThan(10000);
    expect(detectLanguage(longCode)).toBeNull();
  });

  it('isCode returns false for text over 10000 chars', () => {
    const longCode = 'const x = 1;\n'.repeat(1000);
    expect(longCode.length).toBeGreaterThan(10000);
    expect(isCode(longCode)).toBe(false);
  });

  it('detectLanguage works for text just under 10000 chars', () => {
    const code = 'const x = require("foo");\nconsole.log(x);\n'.repeat(200);
    expect(code.length).toBeLessThanOrEqual(10000);
    expect(detectLanguage(code)).not.toBeNull();
  });
});

describe('detection cache', () => {
  it('returns cached results on second call', () => {
    const code = 'const foo = require("bar");\nconsole.log("hello");';
    const result1 = detectLanguage(code);
    expect(getDetectionCacheSize()).toBe(1);
    const result2 = detectLanguage(code);
    expect(result2).toBe(result1);
    expect(getDetectionCacheSize()).toBe(1);
  });

  it('caches isCode results via detectLanguage', () => {
    const code = 'const x = 5; if (x > 3) { return true; }';
    detectLanguage(code);
    expect(getDetectionCacheSize()).toBe(1);
    // isCode should use cached result
    const result = isCode(code);
    expect(result).toBe(true);
    expect(getDetectionCacheSize()).toBe(1);
  });

  it('caches isCode results when called first', () => {
    const code = 'const fn = () => { return 42; }';
    isCode(code);
    expect(getDetectionCacheSize()).toBe(1);
    // detectLanguage should use cached result
    detectLanguage(code);
    expect(getDetectionCacheSize()).toBe(1);
  });

  it('clearDetectionCache empties the cache', () => {
    detectLanguage('const x = require("foo");\nconsole.log(x);');
    expect(getDetectionCacheSize()).toBe(1);
    clearDetectionCache();
    expect(getDetectionCacheSize()).toBe(0);
  });

  it('evicts oldest entry when cache exceeds 200 entries', () => {
    // Fill cache to 200
    for (let i = 0; i < 200; i++) {
      detectLanguage(`const variable_${i} = ${i}; console.log(variable_${i});`);
    }
    expect(getDetectionCacheSize()).toBe(200);

    // Add one more — should evict the first
    detectLanguage('const variable_new = 999; console.log(variable_new);');
    expect(getDetectionCacheSize()).toBe(200);
  });

  it('does not cache results for text that is too short', () => {
    detectLanguage('hi');
    expect(getDetectionCacheSize()).toBe(0);
  });

  it('does not cache results for text that is too long', () => {
    detectLanguage('const x = 1;\n'.repeat(1000));
    expect(getDetectionCacheSize()).toBe(0);
  });
});
