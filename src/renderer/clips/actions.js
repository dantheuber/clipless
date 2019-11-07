import * as types from './action-types';
import {
  lockedClips,
  clipKeyPressed as selectClipKeyPressed,
} from './selectors';

export const clipboardUpdated = text => (dispatch, getState) => {
  const state = getState();
  dispatch({
    type: types.CLIPBOARD_UPDATED,
    payload: text,
    metadata: {
      hotkey: selectClipKeyPressed(state),
      lockedClips: lockedClips(state),
    },
  });
};

export const clipModified = (e, index) => ({
  type: types.CLIP_MODIFIED,
  payload: e.target.value,
  metadata: { index },
});

export const clipKeyPressed = (index) => ({
  type: types.CLIP_KEY_PRESSED,
  payload: index,
});

export const toggleLock = index => ({
  type: types.TOGGLE_LOCK,
  payload: index,
});
