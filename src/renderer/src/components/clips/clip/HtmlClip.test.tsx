import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HtmlClip } from './HtmlClip';

vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({ isLight: false }),
}));

vi.mock('./Clip.module.css', () => ({
  default: { typeLabel: 'typeLabel', light: 'light' },
}));

describe('HtmlClip', () => {
  it('renders HTML label and content', () => {
    render(<HtmlClip clip={{ type: 'html', content: '<p>Hello</p>' }} />);
    expect(screen.getByText('HTML:')).toBeInTheDocument();
    expect(screen.getByText('<p>Hello</p>')).toBeInTheDocument();
  });
});
