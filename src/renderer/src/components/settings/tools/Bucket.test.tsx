import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { Bucket } from './Bucket';
import { GroupPill } from './GroupPill';
import { defaultConfig, installConfig, renderTools } from './harness';

const onPick = vi.fn();
const onClose = vi.fn();

function Host({
  group,
  others,
  colours,
}: {
  group: string;
  others: string[];
  colours: Record<string, number>;
}) {
  const slotFor = (g: string) =>
    colours[g] ?? { ip: 0, email: 1, ticket: 2, domain: 3, url: 4, user: 5 }[g] ?? 6;
  return (
    <div style={{ position: 'relative' }}>
      <span id="anchor">pill</span>
      <Bucket
        group={group}
        others={others}
        slotFor={slotFor}
        groupColours={colours}
        anchor={document.getElementById('anchor') as HTMLElement}
        onPick={onPick}
        onClose={onClose}
      />
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  installConfig(defaultConfig());
  document.body.innerHTML = '<span id="anchor">pill</span>';
});

afterEach(cleanup);

describe('Bucket', () => {
  it('shows twelve slots, marks the current one and the ones other groups use, and names them', async () => {
    await renderTools(
      <Host group="ticket" others={['ip', 'email', 'hash']} colours={{ hash: 0 }} />
    );
    const slots = screen.getAllByRole('button', { name: /slot \d+/ });
    expect(slots).toHaveLength(12);
    expect(slots[2].className).toMatch(/slotCurrent/);
    expect(slots[0]).toHaveAttribute('data-shared', 'ip,hash');
    expect(slots[0]).toHaveAttribute('title', 'also used by ip, hash');
    expect(slots[1]).toHaveAttribute('title', 'also used by email');
    expect(slots[7]).toHaveAttribute('title', 'free');
    expect(screen.getByTestId('bucket')).toHaveTextContent('default: prototype colour');
    fireEvent.click(slots[7]);
    expect(onPick).toHaveBeenCalledWith(7);
  });

  it('resets to the default only when an override exists, and says what the default is', async () => {
    await renderTools(<Host group="hash" others={[]} colours={{}} />);
    expect(screen.getByTestId('bucket')).toHaveTextContent('default: next free colour');
    expect(screen.getByText('reset')).toBeDisabled();
    cleanup();
    await renderTools(<Host group="hash" others={[]} colours={{ hash: 9 }} />);
    fireEvent.click(screen.getByText('reset'));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('opens above the anchor when there is no room below', async () => {
    const anchor = document.getElementById('anchor') as HTMLElement;
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.appendChild(anchor);
    document.body.appendChild(host);
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 250,
      bottom: 270,
      right: 40,
      width: 30,
      height: 20,
    } as DOMRect);
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      bottom: 300,
      right: 600,
      width: 600,
      height: 300,
    } as DOMRect);
    Object.defineProperty(anchor, 'offsetParent', { value: host });
    await renderTools(<Host group="ip" others={[]} colours={{}} />);
    expect(screen.getByTestId('bucket').style.top).toBe('120px');
    expect(screen.getByTestId('bucket').style.left).toBe('10px');
  });

  it('closes on a click outside and on Esc', async () => {
    await renderTools(<Host group="ip" others={[]} colours={{}} />);
    fireEvent.mouseDown(screen.getByTestId('bucket'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: 'a' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('GroupPill', () => {
  it('renders the state in its title and a count, and clicks with its anchor', async () => {
    const onClick = vi.fn();
    await renderTools(
      <>
        <GroupPill group="ip" count={2} />
        <GroupPill group="domain" state="off" />
        <GroupPill group="user" state="orphan" big onClick={onClick} />
        <GroupPill group="email" title="custom" />
      </>
    );
    expect(screen.getByTitle('ip')).toHaveTextContent('2');
    expect(screen.getByTitle('Only a disabled search term produces domain')).toBeInTheDocument();
    const user = screen.getByTitle('No search term produces user');
    fireEvent.click(user);
    expect(onClick).toHaveBeenCalledWith('user', user);
    expect(screen.getByTitle('custom')).toBeInTheDocument();
  });
});
