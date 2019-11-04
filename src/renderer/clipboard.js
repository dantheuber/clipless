import { clipboard, ipcRenderer } from 'electron';
import { CLIPBOARD_CHECK_INTERVAL } from './constants';
import { lastClip as selectLastClip, clip } from './clips/selectors';
import { clipboardUpdated } from './clips/actions';

let clipboardInterval = null;

export const startClipboard = (store) => {
  clipboardInterval = setInterval(() => {
    const lastClip = selectLastClip(store.getState());
    const newClip = clipboard.readText();
    if (newClip !== lastClip) {
      store.dispatch(clipboardUpdated(newClip));
    }
  }, CLIPBOARD_CHECK_INTERVAL);

  ipcRenderer.on('get-clip', (event, args) => {
    clipboard.writeText(clip(store.getState(), args.key));
  });
};

export const stopClipboard = () => {
  clearInterval(clipboardInterval);
  clipboardInterval = null;
};