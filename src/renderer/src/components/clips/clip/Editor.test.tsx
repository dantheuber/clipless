import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Editor } from './Editor';

afterEach(cleanup);

const setup = (props: Partial<React.ComponentProps<typeof Editor>> = {}) => {
  const onChange = vi.fn();
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <Editor
      value="hello"
      language={null}
      onChange={onChange}
      onCommit={onCommit}
      onCancel={onCancel}
      size="row"
      {...props}
    />
  );
  return { ...utils, onChange, onCommit, onCancel, textarea: screen.getByTestId('clip-editor') };
};

describe('Editor', () => {
  it('focuses on mount and reports changes', () => {
    const { textarea, onChange } = setup();
    expect(textarea).toHaveFocus();
    fireEvent.change(textarea, { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalledWith('hi');
  });

  it('Enter commits, Shift+Enter does not, blur commits, Esc cancels without committing', () => {
    const { textarea, onCommit, onCancel } = setup();
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.blur(textarea);
    expect(onCommit).toHaveBeenCalledTimes(2);
  });

  it('renders a token overlay for a known language, one line per line, with empty lines kept', () => {
    const { container } = setup({ value: '{"a": 1}\n\n[1]', language: 'json' });
    const pre = container.querySelector('pre') as HTMLElement;
    expect(pre).not.toBeNull();
    expect(pre.children).toHaveLength(3);
    expect(pre.querySelector('.tok-property')).not.toBeNull();
  });

  it('renders no overlay for prose', () => {
    const { container } = setup({ value: 'plain text' });
    expect(container.querySelector('pre')).toBeNull();
  });

  it('grows to the content in row mode only when multi-line', () => {
    const { textarea, rerender, onChange, onCommit, onCancel } = setup({ value: 'one' });
    expect(textarea.style.height).toBe('');
    rerender(
      <Editor
        value={'one\ntwo'}
        language={null}
        onChange={onChange}
        onCommit={onCommit}
        onCancel={onCancel}
        size="row"
      />
    );
    expect(textarea.style.height).not.toBe('');
  });

  it('keeps the overlay scrolled with the textarea in reader mode', () => {
    const { container, textarea } = setup({ value: 'a\nb', language: 'json', size: 'reader' });
    const pre = container.querySelector('pre') as HTMLElement;
    textarea.scrollTop = 40;
    textarea.scrollLeft = 7;
    fireEvent.scroll(textarea);
    expect(pre.scrollTop).toBe(40);
    expect(pre.scrollLeft).toBe(7);
    // scroll without an overlay is harmless
    cleanup();
    const plain = setup({ value: 'a', size: 'reader' });
    fireEvent.scroll(plain.textarea);
  });
});
