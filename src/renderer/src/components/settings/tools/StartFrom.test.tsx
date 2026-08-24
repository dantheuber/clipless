import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { StartFrom } from './StartFrom';
import { BUILTIN_PATTERNS } from '../../../../../shared/builtinPatterns';
import { defaultConfig, installConfig, renderTools, term, SAMPLE } from './harness';

const onPick = vi.fn();
const onExisting = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('StartFrom', () => {
  it('lists every library entry with its pill, regex, and hits in the sample, plus Blank', async () => {
    installConfig(defaultConfig(), { toolsSampleText: SAMPLE });
    await renderTools(<StartFrom onPick={onPick} onExisting={onExisting} />);
    const cards = screen.getAllByTestId(/^library-/);
    expect(cards).toHaveLength(BUILTIN_PATTERNS.length + 1);
    expect(screen.getByTestId('library-ip')).toHaveTextContent('finds 2 in the sample');
    expect(screen.getByTestId('library-email')).toHaveTextContent('already added');
    expect(screen.getByTestId('library-mac')).not.toHaveTextContent('finds');
    expect(screen.getByTestId('library-ip')).toHaveTextContent(
      BUILTIN_PATTERNS[1].pattern.slice(0, 20)
    );
    expect(screen.getByTestId('library-ip')).toHaveTextContent('IPv4 Address dotted quad');
    expect(screen.getByTestId('library-guid')).toHaveTextContent('UUID v1-5, also called a GUID');

    fireEvent.click(screen.getByTestId('library-ip'));
    expect(onPick).toHaveBeenCalledWith(BUILTIN_PATTERNS[1]);
    fireEvent.click(screen.getByTestId('library-blank'));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('shows already added by pattern body, and re-enables a disabled duplicate', async () => {
    const config = defaultConfig();
    config.terms.push(term('t-old', 'My ids', BUILTIN_PATTERNS[7].pattern, false));
    config.terms.push(term('t-mac', 'MAC', BUILTIN_PATTERNS[5].pattern, true));
    installConfig(config, { toolsSampleText: SAMPLE });
    await renderTools(<StartFrom onPick={onPick} onExisting={onExisting} />);
    expect(screen.getByTestId('library-guid')).toHaveTextContent('already added, off');
    expect(screen.getByTestId('library-guid')).toHaveAttribute('data-added', 'true');
    expect(screen.getByTestId('library-mac')).toHaveTextContent('already added');
    expect(screen.getByTestId('library-mac')).not.toHaveTextContent('off');

    fireEvent.click(screen.getByTestId('library-guid'));
    expect(onExisting).toHaveBeenCalledWith(expect.objectContaining({ id: 't-old' }), true);
    fireEvent.click(screen.getByTestId('library-mac'));
    expect(onExisting).toHaveBeenCalledWith(expect.objectContaining({ id: 't-mac' }), false);
    expect(onPick).not.toHaveBeenCalled();
  });
});
