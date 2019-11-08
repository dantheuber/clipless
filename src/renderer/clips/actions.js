import * as types from './action-types';
import {
  clip,
  lockedClips,
  clipKeyPressed as selectClipKeyPressed,
} from './selectors';
import { clipboard } from 'electron';

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

export const toggleLock = index => ({
  type: types.TOGGLE_LOCK,
  payload: index,
});

export const clipSelected = (index) => (dispatch, getState) => {
  dispatch({
    type: types.CLIP_SELECTED,
    payload: index,
  });
  clipboard.writeText(clip(getState(), index));
};
