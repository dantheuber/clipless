import type { UpdateState } from '../../../../../shared/types';
import type { DotKind } from '../shell/Dot';

export interface UpdateView {
  dot: DotKind;
  head: string;
  detail: string;
  button: 'check' | 'install' | null;
  busy: boolean;
  releases: boolean;
}

export const RELEASES_URL = 'https://github.com/dantheuber/clipless/releases';

export function releaseNotesUrl(version: string): string {
  return `${RELEASES_URL}/tag/v${version}`;
}

export function updateView(state: UpdateState, version: string, platform: string): UpdateView {
  if (platform === 'darwin') {
    return {
      dot: 'clip',
      head: `Clipless ${version}`,
      detail: 'Updates are manual on macOS; the builds are unsigned.',
      button: null,
      busy: false,
      releases: true,
    };
  }
  const found = state.version ?? 'an update';
  switch (state.status) {
    case 'idle':
      return {
        dot: 'off',
        head: `Clipless ${version}`,
        detail: 'Not checked yet',
        button: 'check',
        busy: false,
        releases: false,
      };
    case 'checking':
      return {
        dot: 'busy',
        head: 'Checking for updates',
        detail: '',
        button: 'check',
        busy: true,
        releases: false,
      };
    case 'available':
      return {
        dot: 'busy',
        head: `Update ${found} available`,
        detail: 'Downloading in the background',
        button: 'check',
        busy: true,
        releases: false,
      };
    case 'downloading':
      return {
        dot: 'busy',
        head: `Downloading ${found}`,
        detail: state.progress === undefined ? '' : `${state.progress}%`,
        button: 'check',
        busy: true,
        releases: false,
      };
    case 'downloaded':
      return {
        dot: 'ok',
        head: `${found} downloaded`,
        detail: 'Installs on restart',
        button: 'install',
        busy: false,
        releases: false,
      };
    case 'upToDate':
      return {
        dot: 'ok',
        head: `${version} is the latest`,
        detail: 'Checked just now',
        button: 'check',
        busy: false,
        releases: false,
      };
    case 'error':
      return {
        dot: 'orph',
        head: 'Check failed',
        detail: state.message ?? 'Unknown error',
        button: 'check',
        busy: false,
        releases: false,
      };
  }
}
