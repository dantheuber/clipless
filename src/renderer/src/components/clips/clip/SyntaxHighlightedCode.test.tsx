import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

vi.mock('react-syntax-highlighter/dist/esm/prism-light', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockHighlighter = ({ children, PreTag }: any) => {
    const Tag = PreTag || 'pre';
    return (
      <Tag data-testid="prism-highlighter" {...(typeof Tag !== 'string' ? {} : {})}>
        {children}
      </Tag>
    );
  };
  MockHighlighter.registerLanguage = vi.fn();
  MockHighlighter.alias = vi.fn();
  return { default: MockHighlighter };
});

vi.mock('react-syntax-highlighter/dist/esm/styles/prism/material-dark', () => ({
  default: {},
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism/material-light', () => ({
  default: {},
}));

vi.mock('react-syntax-highlighter/dist/esm/languages/prism/javascript', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/typescript', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/python', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/java', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/csharp', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/cpp', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/c', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/markup', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/css', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/json', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/sql', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/bash', () => ({
  default: {},
}));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/powershell', () => ({
  default: {},
}));

vi.mock('./Clip.module.css', () => ({
  default: {
    textEditorWrapper: 'textEditorWrapper',
    syntaxHighlightContainer: 'syntaxHighlightContainer',
    textEditor: 'textEditor',
    syntaxOverlay: 'syntaxOverlay',
    light: 'light',
  },
}));

describe('SyntaxHighlightedCode', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    editValue: 'const x = 1;',
    syntaxLanguage: 'javascript',
    isLight: false,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onKeyDown: vi.fn(),
  };

  it('renders the syntax highlighter and textarea', () => {
    render(<SyntaxHighlightedCode {...defaultProps} />);
    expect(screen.getByTestId('prism-highlighter')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays the edit value in the highlighter', () => {
    render(<SyntaxHighlightedCode {...defaultProps} />);
    expect(screen.getByTestId('prism-highlighter')).toHaveTextContent('const x = 1;');
  });

  it('passes edit value to the textarea', () => {
    render(<SyntaxHighlightedCode {...defaultProps} />);
    expect(screen.getByRole('textbox')).toHaveValue('const x = 1;');
  });

  it('calls onChange when textarea value changes', () => {
    const onChange = vi.fn();
    render(<SyntaxHighlightedCode {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'const y = 2;' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onBlur when textarea loses focus', () => {
    const onBlur = vi.fn();
    render(<SyntaxHighlightedCode {...defaultProps} onBlur={onBlur} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onBlur).toHaveBeenCalled();
  });

  it('calls onKeyDown on key press', () => {
    const onKeyDown = vi.fn();
    render(<SyntaxHighlightedCode {...defaultProps} onKeyDown={onKeyDown} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('applies dark theme styles by default', () => {
    render(<SyntaxHighlightedCode {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).not.toContain('light');
    expect(textarea.style.caretColor).toBe('#fff');
  });

  it('applies light theme styles when isLight is true', () => {
    render(<SyntaxHighlightedCode {...defaultProps} isLight={true} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('light');
    expect(textarea.style.caretColor).toBe('#000');
  });

  it('forwards ref to the textarea', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<SyntaxHighlightedCode {...defaultProps} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  it('sets textarea to transparent color for overlay effect', () => {
    render(<SyntaxHighlightedCode {...defaultProps} />);
    expect(screen.getByRole('textbox').style.color).toBe('transparent');
  });

  it('disables spellcheck on the textarea', () => {
    render(<SyntaxHighlightedCode {...defaultProps} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('spellcheck', 'false');
  });
});
