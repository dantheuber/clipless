import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('../providers/theme', () => ({
  useTheme: () => ({ isLight: false }),
}));

afterEach(cleanup);

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} title="T" message="M" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('owns Esc while open: cancels and stops the key reaching anything behind it', () => {
    const onCancel = vi.fn();
    const behind = vi.fn();
    render(
      <div onKeyDown={behind}>
        <ConfirmDialog isOpen title="Delete?" message="M" onConfirm={vi.fn()} onCancel={onCancel} />
      </div>
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(behind).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'a' });
    expect(behind).toHaveBeenCalledTimes(1);
  });

  it('releases Esc once closed', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog isOpen title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    rerender(
      <ConfirmDialog isOpen={false} title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirms, cancels from the buttons, and cancels on a backdrop click only', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="T"
        message="M"
        confirmText="Yes"
        cancelText="No"
        type="warning"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Yes'));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('No'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('renders for every type', () => {
    for (const type of ['danger', 'warning', 'info'] as const) {
      render(
        <ConfirmDialog
          isOpen
          title="T"
          message="M"
          type={type}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toHaveAccessibleName('T');
      cleanup();
    }
  });
});
