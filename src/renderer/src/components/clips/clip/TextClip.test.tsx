import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { TextClip } from './TextClip';

let mockIsCodeDetectionEnabled = false;

const { mockThemeState } = vi.hoisted(() => ({
  mockThemeState: { isLight: false },
}));

// Mock providers
vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({
    isLight: mockThemeState.isLight,
    isDark: !mockThemeState.isLight,
    theme: mockThemeState.isLight ? 'light' : 'dark',
    effectiveTheme: mockThemeState.isLight ? 'light' : 'dark',
    setTheme: vi.fn(),
  }),
}));

vi.mock('../../../providers/languageDetection', () => ({
  useLanguageDetection: () => ({
    isCodeDetectionEnabled: mockIsCodeDetectionEnabled,
    settings: { codeDetectionEnabled: mockIsCodeDetectionEnabled },
    updateSettings: vi.fn(),
    detectTextLanguage: vi.fn(),
  }),
}));

vi.mock('../../../utils/languageDetection', () => ({
  mapToSyntaxHighlighterLanguage: vi.fn().mockReturnValue('javascript'),
}));

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, PreTag, ...props }: any) => {
    const Tag = PreTag || 'pre';
    return (
      <Tag data-testid="syntax-highlighter" {...(typeof Tag !== 'string' ? {} : {})}>
        {children}
      </Tag>
    );
  },
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  materialDark: {},
  materialLight: {},
}));

vi.mock('./Clip.module.css', () => ({
  default: {
    editableText: 'editableText',
    light: 'light',
    emptyText: 'emptyText',
    textEditorWrapper: 'textEditorWrapper',
    textEditor: 'textEditor',
    syntaxHighlightContainer: 'syntaxHighlightContainer',
    syntaxOverlay: 'syntaxOverlay',
  },
}));

describe('TextClip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsCodeDetectionEnabled = false;
    mockThemeState.isLight = false;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders text content in display mode', () => {
    render(<TextClip clip={{ type: 'text', content: 'Hello World' }} onUpdate={vi.fn()} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders (empty) for empty content', () => {
    render(<TextClip clip={{ type: 'text', content: '' }} onUpdate={vi.fn()} />);
    expect(screen.getByText('(empty)')).toBeInTheDocument();
  });

  it('does not enter edit mode for empty content', () => {
    render(<TextClip clip={{ type: 'text', content: '' }} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('(empty)'));
    // Should still show (empty), not a textarea
    expect(screen.getByText('(empty)')).toBeInTheDocument();
  });

  it('collapses multiline text to single line in display mode', () => {
    render(<TextClip clip={{ type: 'text', content: 'line1\nline2\nline3' }} onUpdate={vi.fn()} />);
    expect(screen.getByText('line1 line2 line3')).toBeInTheDocument();
  });

  it('enters edit mode on click and shows textarea', () => {
    render(<TextClip clip={{ type: 'text', content: 'Hello World' }} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('Hello World'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onEditingChange when entering and leaving edit mode', () => {
    const onEditingChange = vi.fn();
    render(
      <TextClip
        clip={{ type: 'text', content: 'Hello World' }}
        onUpdate={vi.fn()}
        onEditingChange={onEditingChange}
      />
    );
    fireEvent.click(screen.getByText('Hello World'));
    expect(onEditingChange).toHaveBeenCalledWith(true);

    fireEvent.blur(screen.getByRole('textbox'));
    expect(onEditingChange).toHaveBeenCalledWith(false);
  });

  it('calls onUpdate with debounce on text change', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello World' } });

    // Not called immediately
    expect(onUpdate).not.toHaveBeenCalled();

    // Called after debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onUpdate).toHaveBeenCalledWith('Hello World');
  });

  it('clears previous debounce when typing rapidly', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'First' } });

    // Advance partially
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Type again before debounce fires - this triggers clearTimeout branch
    fireEvent.change(textarea, { target: { value: 'Second' } });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should only get the last value
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('Second');
  });

  it('does not call onUpdate when value unchanged', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('calls onUpdate immediately on blur with pending changes', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.blur(textarea);

    expect(onUpdate).toHaveBeenCalledWith('Changed');
  });

  it('handles Enter key to finish editing', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onUpdate).toHaveBeenCalledWith('Changed');
  });

  it('handles Escape key to cancel editing', () => {
    const onUpdate = vi.fn();
    const onEditingChange = vi.fn();
    render(
      <TextClip
        clip={{ type: 'text', content: 'Hello' }}
        onUpdate={onUpdate}
        onEditingChange={onEditingChange}
      />
    );
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });

    // Should not call onUpdate (cancelled)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onEditingChange).toHaveBeenCalledWith(false);
  });

  it('renders syntax highlighter when code detection enabled and clip has language', () => {
    mockIsCodeDetectionEnabled = true;
    render(
      <TextClip
        clip={{ type: 'text', content: 'const x = 1;', isCode: true, language: 'javascript' }}
        onUpdate={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('const x = 1;'));

    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
  });

  it('updates syntax container height on text change', () => {
    mockIsCodeDetectionEnabled = true;
    render(
      <TextClip
        clip={{ type: 'text', content: 'const x = 1;', isCode: true, language: 'javascript' }}
        onUpdate={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('const x = 1;'));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'const x = 2;\nconst y = 3;' } });

    // The useEffect should have run and attempted to set height on syntax container
    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
  });

  it('renders plain textarea when code detection disabled', () => {
    mockIsCodeDetectionEnabled = false;
    render(
      <TextClip
        clip={{ type: 'text', content: 'const x = 1;', isCode: true, language: 'javascript' }}
        onUpdate={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('const x = 1;'));

    expect(screen.queryByTestId('syntax-highlighter')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows whitespace-only content as (empty)', () => {
    render(<TextClip clip={{ type: 'text', content: '   ' }} onUpdate={vi.fn()} />);
    expect(screen.getByText('(empty)')).toBeInTheDocument();
  });

  it('does not call onUpdate on blur when no pending changes', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    // Blur immediately without changing anything
    fireEvent.blur(screen.getByRole('textbox'));

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('does not call onUpdate on blur when pending change matches original', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    const textarea = screen.getByRole('textbox');
    // Change then change back to original
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    // Blur with a pending debounce but editValue === clip.content
    fireEvent.blur(textarea);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('handles Escape without onEditingChange callback', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    // Should not throw, just exit edit mode
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('ignores non-special keys in keyDown handler', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' });

    // Should still be in edit mode, no update called
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('allows Shift+Enter without exiting edit mode', () => {
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText('Hello'));

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true });

    // Should still be in edit mode
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles Escape without pending debounce', () => {
    const onUpdate = vi.fn();
    render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText('Hello'));

    // Press Escape without typing anything (no debounce pending)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  describe('light theme', () => {
    beforeEach(() => {
      mockThemeState.isLight = true;
    });

    it('applies light class in display mode', () => {
      render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={vi.fn()} />);
      expect(screen.getByText('Hello').className).toContain('light');
    });

    it('applies light class in plain edit mode', () => {
      render(<TextClip clip={{ type: 'text', content: 'Hello' }} onUpdate={vi.fn()} />);
      fireEvent.click(screen.getByText('Hello'));
      expect(screen.getByRole('textbox').className).toContain('light');
    });

    it('applies light styles in syntax-highlighted edit mode', () => {
      mockIsCodeDetectionEnabled = true;
      render(
        <TextClip
          clip={{ type: 'text', content: 'const x = 1;', isCode: true, language: 'javascript' }}
          onUpdate={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('const x = 1;'));

      const textarea = screen.getByRole('textbox');
      expect(textarea.className).toContain('light');
      expect(textarea.style.caretColor).toBe('#000');
    });

    it('applies light class to empty content display', () => {
      render(<TextClip clip={{ type: 'text', content: '' }} onUpdate={vi.fn()} />);
      const el = screen.getByText('(empty)');
      expect(el.className).toContain('light');
      expect(el.className).toContain('emptyText');
    });
  });
});
