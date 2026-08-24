import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ToastProvider } from './Toast';
import { useToast, TOAST_DURATION } from './useToast';

function Button({ title, detail }: { title: string; detail?: string | string[] }) {
  const toast = useToast();
  return <button onClick={() => toast(title, detail)}>{title}</button>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('shows a toast with its title and detail lines', () => {
    render(
      <ToastProvider>
        <Button title="Copied" detail={['line one', 'line two']} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Copied', { selector: 'button' }));
    const toast = screen.getByTestId('toast');
    expect(toast).toHaveTextContent('Copied');
    expect(toast).toHaveTextContent('line one');
    expect(toast).toHaveTextContent('line two');
  });

  it('accepts a single detail string and no detail at all', () => {
    render(
      <ToastProvider>
        <Button title="One" detail="just this" />
        <Button title="Bare" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('One', { selector: 'button' }));
    fireEvent.click(screen.getByText('Bare', { selector: 'button' }));
    const toasts = screen.getAllByTestId('toast');
    expect(toasts[0]).toHaveTextContent('just this');
    expect(toasts[1].querySelector('ul')).toBeNull();
  });

  it('dismisses after the duration', () => {
    render(
      <ToastProvider>
        <Button title="Gone soon" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Gone soon', { selector: 'button' }));
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION);
    });
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('dismisses on click', () => {
    render(
      <ToastProvider>
        <Button title="Click me away" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Click me away', { selector: 'button' }));
    fireEvent.click(screen.getByTestId('toast'));
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('stacks at most three, dropping the oldest', () => {
    render(
      <ToastProvider>
        <Button title="A" />
        <Button title="B" />
        <Button title="C" />
        <Button title="D" />
      </ToastProvider>
    );
    for (const title of ['A', 'B', 'C', 'D']) {
      fireEvent.click(screen.getByText(title, { selector: 'button' }));
    }
    const toasts = screen.getAllByTestId('toast');
    expect(toasts).toHaveLength(3);
    expect(toasts.map((t) => t.textContent)).toEqual(['B', 'C', 'D']);
  });

  it('throws when used outside the provider', () => {
    expect(() => render(<Button title="x" />)).toThrow('useToast must be used within');
  });
});
