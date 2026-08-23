import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ScanResult } from '../../../../../shared/types';
import { ScanIndexContext, type ScanIndex } from '../../../providers/scan';
import { ChipsPreview } from './ValueChip';
import { TokenText } from './TokenText';
import { insertAtCaret } from './TokenPicker';
import { trapTab } from './editorHost';
import { tokenise } from './resolve';

const index: ScanIndex = {
  loaded: true,
  terms: [],
  tools: [],
  templates: [],
  groupColours: {},
  getScan: () => null,
  slotFor: () => 0,
  version: 0,
};

const wrap = (ui: React.ReactNode) =>
  render(<ScanIndexContext.Provider value={index}>{ui}</ScanIndexContext.Provider>);

afterEach(cleanup);

describe('ChipsPreview', () => {
  it('draws a match that starts the text and one that ends it with no stray pieces', () => {
    const scan: ScanResult = {
      matches: [
        { group: 'ip', value: '1.1.1.1', start: 0, end: 7, termId: 't' },
        { group: 'ip', value: '2.2.2.2', start: 11, end: 18, termId: 't' },
      ],
      groups: ['ip'],
      errors: [],
      large: false,
    };
    wrap(<ChipsPreview text="1.1.1.1 to 2.2.2.2" scan={scan} />);
    const preview = screen.getByTestId('chips-preview');
    expect(preview.querySelectorAll('[data-group="ip"]')).toHaveLength(2);
    expect(preview).toHaveTextContent('1.1.1.1 to 2.2.2.2');
  });
});

describe('TokenText', () => {
  it('copes with a token that names no group', () => {
    wrap(<TokenText segments={tokenise('x {|} y')} terms={[]} />);
    expect(screen.getByText('{|}')).toHaveAttribute('data-orphan', 'true');
  });
});

describe('insertAtCaret', () => {
  it('appends when there is no input to read a caret from', () => {
    expect(insertAtCaret(null, 'abc', '{x}')).toEqual({ value: 'abc{x}', caret: 6 });
  });
});

describe('trapTab', () => {
  it('does nothing without focusable controls, or for other keys', () => {
    const preventDefault = vi.fn();
    const root = document.createElement('div');
    const event = (key: string) =>
      ({
        key,
        currentTarget: root,
        shiftKey: false,
        preventDefault,
      }) as unknown as React.KeyboardEvent<HTMLElement>;
    trapTab(event('Tab'));
    trapTab(event('a'));
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
