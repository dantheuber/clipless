import { describe, it, expect } from 'vitest';
import { errorText } from './errorText';

describe('errorText', () => {
  it('takes the message of an Error and the string form of anything else', () => {
    expect(errorText(new Error('boom'))).toBe('boom');
    expect(errorText('plain')).toBe('plain');
    expect(errorText(42)).toBe('42');
  });

  it("strips Electron's wrapper from a rejected IPC handler", () => {
    expect(
      errorText(
        new Error(
          "Error invoking remote method 'storage-save-clips': Error: Storage could not be loaded: no keystore"
        )
      )
    ).toBe('Storage could not be loaded: no keystore');
    expect(errorText(new Error("Error invoking remote method 'x': ENOSPC: no space left"))).toBe(
      'ENOSPC: no space left'
    );
  });
});
