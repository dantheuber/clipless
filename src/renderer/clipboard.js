import { clipboard } from 'electron';
import { CLIPBOARD_CHECK_INTERVAL } from './constants';
import { lastClip as selectLastClip } from './clips/selectors';
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
};

export const stopClipboard = () => {
  clearInterval(clipboardInterval);
  clipboardInterval = null;
};