import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ScanResult } from '../../../../../shared/types';
import { TextClip } from './TextClip';

let mockIsCodeDetectionEnabled = false;

vi.mock('../../../providers/languageDetection', () => ({
  useLanguageDetection: () => ({
    isCodeDetectionEnabled: mockIsCodeDetectionEnabled,
  }),
}));

const { pinsState } = vi.hoisted(() => ({
  pinsState: { pinned: new Set<string>(), togglePins: vi.fn() },
}));

vi.mock('../../../providers/clips', () => ({
  useClipsPins: () => ({
    isPinned: (key: string) => pinsState.pinned.has(key),
    togglePins: pinsState.togglePins,
  }),
}));

vi.mock('../../../providers/scan', () => ({
  useScanIndex: () => ({ slotFor: () => 0 }),
}));

const clip = (content: string, extra = {}) => ({
  id: 'c1',
  type: 'text' as const,
  content,
  ...extra,
});

const scanOf = (text: string, group: string, value: string): ScanResult => {
  const start = text.indexOf(value);
  return {
    matches: [{ group, value, start, end: start + value.length, termId: 't' }],
    groups: [group],
    errors: [],
    large: false,
  };
};

beforeEach(() => {
  mockIsCodeDetectionEnabled = false;
  pinsState.togglePins.mockClear();
});

afterEach(cleanup);

describe('TextClip display', () => {
  it('renders the text and (empty) for an empty clip, which cannot be edited', () => {
    render(<TextClip clip={clip('Hello World')} scan={null} onUpdate={vi.fn()} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    cleanup();
    render(<TextClip clip={clip('')} scan={null} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('(empty)'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps multi-line text in one line element (whitespace collapses in CSS)', () => {
    render(<TextClip clip={clip('line1\nline2')} scan={null} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('clip-line').textContent).toBe('line1\nline2');
  });

  it('shows a language tag for code and a chip for every match', () => {
    const text = 'ssh admin@10.0.0.1';
    render(
      <TextClip
        clip={clip(text, { isCode: true, language: 'bash' })}
        scan={scanOf(text, 'ip', '10.0.0.1')}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText('bash')).toBeInTheDocument();
    const chip = screen.getByText('10.0.0.1').closest('[data-key]');
    expect(chip).toHaveAttribute('data-key', 'ip|10.0.0.1');
  });

  it('clicking a chip pins and never enters edit', () => {
    const text = 'host 10.0.0.1';
    render(<TextClip clip={clip(text)} scan={scanOf(text, 'ip', '10.0.0.1')} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('10.0.0.1'));
    expect(pinsState.togglePins).toHaveBeenCalledWith(['ip|10.0.0.1']);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('marks search hits without making them chips', () => {
    render(
      <TextClip clip={clip('alpha beta alpha')} scan={null} searchTerm="ALPHA" onUpdate={vi.fn()} />
    );
    const marks = screen.getAllByText('alpha', { selector: 'mark' });
    expect(marks).toHaveLength(2);
    expect(document.querySelector('[data-key]')).toBeNull();
  });
});

describe('TextClip editing', () => {
  it('clicking plain text enters edit with the content and no chips', () => {
    const text = 'host 10.0.0.1';
    const onEditingChange = vi.fn();
    render(
      <TextClip
        clip={clip(text)}
        scan={scanOf(text, 'ip', '10.0.0.1')}
        onUpdate={vi.fn()}
        onEditingChange={onEditingChange}
      />
    );
    fireEvent.click(screen.getByText('host', { exact: false }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe(text);
    expect(document.querySelector('[data-key]')).toBeNull();
    expect(onEditingChange).toHaveBeenCalledWith(true);
  });

  it('does not save while typing; Enter commits the change', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={clip('Hello')} scan={null} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello World' } });
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('Hello World');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Shift+Enter keeps editing; blur commits', () => {
    const onUpdate = vi.fn();
    const onEditingChange = vi.fn();
    render(
      <TextClip
        clip={clip('Hello')}
        scan={null}
        onUpdate={onUpdate}
        onEditingChange={onEditingChange}
      />
    );
    fireEvent.click(screen.getByText('Hello'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello\nthere' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    fireEvent.blur(textarea);
    expect(onUpdate).toHaveBeenCalledWith('Hello\nthere');
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
  });

  it('does not call onUpdate when the value is unchanged', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={clip('Hello')} scan={null} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('Esc restores the pre-edit content and saves nothing', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={clip('Hello')} scan={null} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('Esc in the editor does not reach an outer Esc handler', () => {
    const outer = vi.fn();
    render(
      <div onKeyDown={outer}>
        <TextClip clip={clip('Hello')} scan={null} onUpdate={vi.fn()} />
      </div>
    );
    fireEvent.click(screen.getByText('Hello'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(outer).not.toHaveBeenCalled();
  });

  it('enters edit from the keyboard when editSeq changes', () => {
    const { rerender } = render(
      <TextClip clip={clip('Hello')} scan={null} onUpdate={vi.fn()} editSeq={0} />
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    rerender(<TextClip clip={clip('Hello')} scan={null} onUpdate={vi.fn()} editSeq={1} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    // a second bump while already editing changes nothing
    rerender(<TextClip clip={clip('Hello')} scan={null} onUpdate={vi.fn()} editSeq={2} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('uses the syntax overlay for code when detection is on, and not when it is off', () => {
    mockIsCodeDetectionEnabled = true;
    const code = clip('{"a": 1}', { isCode: true, language: 'json' });
    const { container } = render(<TextClip clip={code} scan={null} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('{"a": 1}'));
    expect(container.querySelector('pre')).not.toBeNull();
    cleanup();
    mockIsCodeDetectionEnabled = false;
    const again = render(<TextClip clip={code} scan={null} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('{"a": 1}'));
    expect(again.container.querySelector('pre')).toBeNull();
  });
});
