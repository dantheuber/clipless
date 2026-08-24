import type * as MediaQueryModule from '../hooks/useMediaQuery';

export function mediaQueryTestHooks(
  actual: typeof MediaQueryModule,
  state: { short: boolean; narrow: boolean }
) {
  return {
    ...actual,
    useMediaQuery: (query: string) => (query === actual.SHORT_WINDOW ? state.short : state.narrow),
  };
}
