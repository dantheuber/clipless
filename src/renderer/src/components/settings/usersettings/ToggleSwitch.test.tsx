import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ToggleSwitch } from './ToggleSwitch';

afterEach(cleanup);

describe('ToggleSwitch', () => {
  it('is a switch with no ON or OFF text that reports its new state', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ToggleSwitch checked={false} onChange={onChange} label="Always on top" testId="t" />
    );
    expect(container).not.toHaveTextContent(/ON|OFF/);
    const input = screen.getByTestId('t');
    expect(input).toHaveAttribute('role', 'switch');
    expect(input).toHaveAttribute('aria-label', 'Always on top');
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('is inert while disabled', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked disabled onChange={onChange} testId="t" />);
    expect(screen.getByTestId('t')).toBeDisabled();
  });
});
