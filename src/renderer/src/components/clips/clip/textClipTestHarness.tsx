import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TextClip } from './TextClip';
import { clip } from './clipTestFixtures';

export function startEditing(onUpdate = vi.fn()) {
  render(<TextClip clip={clip('Hello')} scan={null} onUpdate={onUpdate} />);
  fireEvent.click(screen.getByText('Hello'));
  return { onUpdate, textarea: screen.getByRole('textbox') };
}
