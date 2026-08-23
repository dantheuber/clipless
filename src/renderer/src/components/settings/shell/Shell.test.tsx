import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Rail } from './Rail';
import { Pane } from './Pane';
import { Footer } from './Footer';
import { Status } from './Status';
import { Tooltip } from './Tooltip';
import { Dot } from './Dot';

afterEach(cleanup);

describe('Rail', () => {
  it('lists the three tabs, marks the active one and shows the version at its foot', () => {
    const onSelect = vi.fn();
    render(<Rail active="hotkeys" onSelect={onSelect} version="1.8.10" />);
    expect(screen.getByTestId('rail-general')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('rail-hotkeys')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('rail-version')).toHaveTextContent('v1.8.10');
    fireEvent.click(screen.getByTestId('rail-tools'));
    expect(onSelect).toHaveBeenCalledWith('tools');
  });
});

describe('Pane and Footer', () => {
  it('renders the title bar, the content and the footer line with its links', () => {
    render(
      <Pane
        title="General"
        bar={<span>bar</span>}
        footer={
          <Footer text="Changes apply as you make them.">
            <button>export</button>
          </Footer>
        }
      >
        <p>content</p>
      </Pane>
    );
    expect(screen.getByTestId('title-bar')).toHaveTextContent('General');
    expect(screen.getByTestId('title-bar')).toHaveTextContent('bar');
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toHaveTextContent('Changes apply as you make them.');
    expect(screen.getByText('export')).toBeInTheDocument();
  });

  it('can leave scrolling to the tab', () => {
    const { container } = render(
      <Pane title="Tools" scroll={false}>
        <p>own panes</p>
      </Pane>
    );
    expect(container.querySelector('[class*="scroll"]')).toBeNull();
  });
});

describe('Status', () => {
  it('renders nothing, saving, saved with and without undo, and not saved with retry', () => {
    const undo = vi.fn();
    const retry = vi.fn();
    const { rerender } = render(<Status status={undefined} testId="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('');

    rerender(<Status status={{ kind: 'saving' }} testId="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('saving');

    rerender(<Status status={{ kind: 'saved', label: true, undo }} testId="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('saved');
    fireEvent.click(screen.getByText('undo'));
    expect(undo).toHaveBeenCalled();

    rerender(<Status status={{ kind: 'saved', label: false, undo }} testId="s" />);
    expect(screen.getByTestId('s')).not.toHaveTextContent('saved');
    expect(screen.getByText('undo')).toBeInTheDocument();

    rerender(<Status status={{ kind: 'saved', label: true }} testId="s" />);
    expect(screen.queryByText('undo')).toBeNull();

    rerender(<Status status={{ kind: 'error', retry, message: 'why' }} testId="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('not saved');
    expect(screen.getByTestId('s')).toHaveAttribute('title', 'why');
    fireEvent.click(screen.getByText('retry'));
    expect(retry).toHaveBeenCalled();
  });
});

describe('Tooltip and Dot', () => {
  it('puts the description in the title and marks the label', () => {
    render(<Tooltip text="long form">Label</Tooltip>);
    expect(screen.getByText('Label')).toHaveAttribute('title', 'long form');
  });

  it('renders every dot kind', () => {
    const { container } = render(
      <>
        <Dot kind="ok" />
        <Dot kind="no" />
        <Dot kind="orph" title="broken" />
        <Dot kind="off" />
        <Dot kind="clip" />
        <Dot kind="busy" />
      </>
    );
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(6);
    expect(container.querySelector('[data-dot="orph"]')).toHaveAttribute('title', 'broken');
  });
});
