import type { UpdateState } from '../../../../shared/types';

/**
 * The text for each updater status. The state comes from the main process; there is no
 * display string to match against.
 */
export function updateStatusText(state: UpdateState): string {
  switch (state.status) {
    case 'idle':
      return 'Ready';
    case 'checking':
      return 'Checking for updates...';
    case 'available':
      return state.version
        ? `Update ${state.version} available, downloading...`
        : 'Update available, downloading...';
    case 'downloading':
      return state.progress === undefined ? 'Downloading...' : `Downloading ${state.progress}%`;
    case 'downloaded':
      return 'Update downloaded. Restart to install.';
    case 'upToDate':
      return 'No updates available';
    case 'error':
      return `Error: ${state.message ?? 'Unknown error'}`;
  }
}
