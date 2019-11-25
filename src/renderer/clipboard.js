import { clipboard, ipcRenderer } from 'electron';
import { CLIPBOARD_CHECK_INTERVAL } from './constants';
import {
  clips,
  clipsChanged,
  lastClip as selectLastClip,
} from './clips/selectors';
import { clipboardUpdated, clipSelected, clipsSaved } from './clips/actions';
import { CLIP_SAVE_INTERVAL } from './clips/constants';

let clipboardInterval = null;
let clipSaveInterval = null;

export const startClipboard = (store) => {
  clipboardInterval = setInterval(() => {
    const lastClip = selectLastClip(store.getState());
    const newClip = clipboard.readText();
    if (newClip !== lastClip) {
      store.dispatch(clipboardUpdated(newClip));
    }
  }, CLIPBOARD_CHECK_INTERVAL);

  clipSaveInterval = setInterval(() => {
    const state = store.getState();
    if (clipsChanged(state)) {
      ipcRenderer.send('save-clips', {
        clips: clips(state),
      });
      store.dispatch(clipsSaved());
    }
  }, CLIP_SAVE_INTERVAL);

  ipcRenderer.on('get-clip', (event, { index }) => {
    store.dispatch(clipSelected(index));
  });
};

export const stopClipboard = () => {
  clearInterval(clipboardInterval);
  clearInterval(clipSaveInterval);
  clipboardInterval = null;
  clipSaveInterval = null;
};