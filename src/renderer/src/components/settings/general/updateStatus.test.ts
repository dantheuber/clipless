import { describe, it, expect } from 'vitest';
import { releaseNotesUrl, updateView } from './updateStatus';

describe('updateView', () => {
  it('maps every status to a dot, two lines and one button', () => {
    expect(updateView({ status: 'idle' }, '1.9.0', 'linux')).toMatchObject({
      dot: 'off',
      head: 'Clipless 1.9.0',
      button: 'check',
      busy: false,
    });
    expect(updateView({ status: 'checking' }, '1.9.0', 'linux')).toMatchObject({
      dot: 'busy',
      busy: true,
    });
    expect(updateView({ status: 'available', version: '2.0.0' }, '1.9.0', 'win32')).toMatchObject({
      dot: 'busy',
      head: 'Update 2.0.0 available',
      detail: 'Downloading in the background',
    });
    expect(updateView({ status: 'available' }, '1.9.0', 'win32').head).toBe(
      'Update an update available'
    );
    expect(
      updateView({ status: 'downloading', version: '2.0.0', progress: 40 }, '1.9.0', 'linux')
    ).toMatchObject({ head: 'Downloading 2.0.0', detail: '40%', busy: true });
    expect(updateView({ status: 'downloading' }, '1.9.0', 'linux').detail).toBe('');
    expect(updateView({ status: 'downloaded', version: '2.0.0' }, '1.9.0', 'linux')).toMatchObject({
      dot: 'ok',
      head: '2.0.0 downloaded',
      detail: 'Installs on restart',
      button: 'install',
    });
    expect(updateView({ status: 'upToDate' }, '1.9.0', 'linux')).toMatchObject({
      dot: 'ok',
      head: '1.9.0 is the latest',
    });
    expect(updateView({ status: 'error', message: 'offline' }, '1.9.0', 'linux')).toMatchObject({
      dot: 'orph',
      head: 'Check failed',
      detail: 'offline',
    });
    expect(updateView({ status: 'error' }, '1.9.0', 'linux').detail).toBe('Unknown error');
  });

  it('offers the releases page and no button on macOS whatever the state', () => {
    const view = updateView({ status: 'downloaded', version: '2' }, '1.9.0', 'darwin');
    expect(view).toMatchObject({ dot: 'clip', button: null, releases: true });
    expect(view.detail).toMatch(/unsigned/);
  });

  it('links the release notes of a version', () => {
    expect(releaseNotesUrl('1.9.0')).toBe(
      'https://github.com/dantheuber/clipless/releases/tag/v1.9.0'
    );
  });
});
