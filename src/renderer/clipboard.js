import { clipboard, ipcRenderer } from 'electron';
import { CLIPBOARD_CHECK_INTERVAL } from './constants';
import { lastClip as selectLastClip } from './clips/selectors';
import { clipboardUpdated, clipSelected } from './clips/actions';

let clipboardInterval = null;

export const startClipboard = (store) => {
  clipboardInterval = setInterval(() => {
    const lastClip = selectLastClip(store.getState());
    const newClip = clipboard.readText();
    if (newClip !== lastClip) {
      store.dispatch(clipboardUpdated(newClip));
    }
  }, CLIPBOARD_CHECK_INTERVAL);

  ipcRenderer.on('get-clip', (event, { index }) => {
    store.dispatch(clipSelected(index));
  });
};

export const stopClipboard = () => {
  clearInterval(clipboardInterval);
  clipboardInterval = null;
};