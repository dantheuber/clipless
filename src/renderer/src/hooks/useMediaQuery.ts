import { useEffect, useState } from 'react';

/**
 * Whether a media query matches, kept current as the window resizes. The narrow and short
 * window rules (spec 16 rules 1 and 11) read this where CSS alone cannot decide.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export const SHORT_WINDOW = '(max-height: 359px)';
export const NARROW_WINDOW = '(max-width: 479px)';
