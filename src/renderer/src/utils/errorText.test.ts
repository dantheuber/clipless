import { describe, it, expect } from 'vitest';
import { errorText } from './errorText';

describe('errorText', () => {
  it('takes the message of an Error and the string form of anything else', () => {
    expect(errorText(new Error('boom'))).toBe('boom');
    expect(errorText('plain')).toBe('plain');
    expect(errorText(42)).toBe('42');
  });
});
