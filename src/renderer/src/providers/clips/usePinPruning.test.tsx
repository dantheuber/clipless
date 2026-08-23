import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import { EMPTY_PINS, setPins, type PinMap } from './pins';
import { usePinPruning } from './usePinPruning';

const clip = (id: string, content: string): ClipItem => ({ id, type: 'text', content });

const ipScan = (text: string): ScanResult => {
  const matches = [...text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)].map((m) => ({
    group: 'ip',
    value: m[0],
    start: m.index as number,
    end: (m.index as number) + m[0].length,
    termId: 't',
  }));
  return { matches, groups: matches.length ? ['ip'] : [], errors: [], large: false };
};

function Probe({
  clips,
  getScan,
  version,
  pinsRef,
  onPrune,
}: {
  clips: ClipItem[];
  getScan: (c: ClipItem) => ScanResult | null;
  version: number;
  pinsRef: React.MutableRefObject<PinMap>;
  onPrune: (pins: PinMap, notice: string) => void;
}) {
  usePinPruning(clips, getScan, version, pinsRef, onPrune);
  return null;
}

afterEach(cleanup);

describe('usePinPruning', () => {
  it('drops a pin after an edit removes its value and names the reason', () => {
    const pinsRef = { current: setPins(EMPTY_PINS, ['ip|1.1.1.1'], true, 0) };
    const onPrune = vi.fn();
    const getScan = (c: ClipItem) => ipScan(c.content);
    const { rerender } = render(
      <Probe
        clips={[clip('a', 'host 1.1.1.1')]}
        getScan={getScan}
        version={0}
        pinsRef={pinsRef}
        onPrune={onPrune}
      />
    );
    expect(onPrune).not.toHaveBeenCalled();
    rerender(
      <Probe
        clips={[clip('a', 'host gone')]}
        getScan={getScan}
        version={0}
        pinsRef={pinsRef}
        onPrune={onPrune}
      />
    );
    expect(onPrune).toHaveBeenCalledTimes(1);
    const [pins, notice] = onPrune.mock.calls[0];
    expect(pins.size).toBe(0);
    expect(notice).toBe('Dropped 1.1.1.1 (ip) after the edit');
  });

  it('prunes nothing while a scan is pending and prunes when it lands', () => {
    const pinsRef = { current: setPins(EMPTY_PINS, ['ip|1.1.1.1'], true, 0) };
    const onPrune = vi.fn();
    let pending = true;
    const getScan = (c: ClipItem) => (pending ? null : ipScan(c.content));
    const clips = [clip('a', 'nothing here')];
    const { rerender } = render(
      <Probe clips={clips} getScan={getScan} version={0} pinsRef={pinsRef} onPrune={onPrune} />
    );
    expect(onPrune).not.toHaveBeenCalled();
    pending = false;
    rerender(
      <Probe clips={clips} getScan={getScan} version={1} pinsRef={pinsRef} onPrune={onPrune} />
    );
    expect(onPrune).toHaveBeenCalledTimes(1);
    expect(onPrune.mock.calls[0][1]).toBe('Dropped 1.1.1.1 (ip) after the search terms changed');
  });

  it('does not fire when every pin is still present', () => {
    const pinsRef = { current: setPins(EMPTY_PINS, ['ip|1.1.1.1'], true, 0) };
    const onPrune = vi.fn();
    const getScan = (c: ClipItem) => ipScan(c.content);
    const { rerender } = render(
      <Probe
        clips={[clip('a', '1.1.1.1')]}
        getScan={getScan}
        version={0}
        pinsRef={pinsRef}
        onPrune={onPrune}
      />
    );
    rerender(
      <Probe
        clips={[clip('n', 'new'), clip('a', '1.1.1.1')]}
        getScan={getScan}
        version={0}
        pinsRef={pinsRef}
        onPrune={onPrune}
      />
    );
    expect(onPrune).not.toHaveBeenCalled();
  });
});
