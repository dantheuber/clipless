import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDetectionCache,
  detectLanguage,
  getDetectionCacheSize,
  isCode,
} from './languageDetection';

beforeEach(clearDetectionCache);

describe('text length threshold', () => {
  it('detectLanguage returns null for text over 10000 chars', () => {
    const longCode = 'const x = 1;\n'.repeat(1000);
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
    expect(isCode(code)).toBe(true);
    expect(getDetectionCacheSize()).toBe(1);
  });

  it('caches isCode results when called first', () => {
    const code = 'const fn = () => { return 42; }';
    isCode(code);
    expect(getDetectionCacheSize()).toBe(1);
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
    for (let i = 0; i < 200; i++) {
      detectLanguage(`const variable_${i} = ${i}; console.log(variable_${i});`);
    }
    expect(getDetectionCacheSize()).toBe(200);
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
