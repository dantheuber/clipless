import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextClip } from './TextClip';

// Mock providers
vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({ isLight: false, isDark: true, theme: 'dark', effectiveTheme: 'dark', setTheme: vi.fn() }),
}));

vi.mock('../../../providers/languageDetection', () => ({
  useLanguageDetection: () => ({
    isCodeDetectionEnabled: false,
    settings: { codeDetectionEnabled: false },
    updateSettings: vi.fn(),
    detectTextLanguage: vi.fn(),
  }),
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
  it('renders text content in display mode', () => {
    render(
      <TextClip
        clip={{ type: 'text', content: 'Hello World' }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders (empty) for empty content', () => {
    render(
      <TextClip
        clip={{ type: 'text', content: '' }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText('(empty)')).toBeInTheDocument();
  });

  it('collapses multiline text to single line in display mode', () => {
    render(
      <TextClip
        clip={{ type: 'text', content: 'line1\nline2\nline3' }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText('line1 line2 line3')).toBeInTheDocument();
  });
});
