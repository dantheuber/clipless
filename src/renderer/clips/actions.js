import * as types from './action-types';
import { clipKeyPressed as selectClipKeyPressed } from './selectors';

export const clipboardUpdated = text => (dispatch, getState) => {
  dispatch({
    type: types.CLIPBOARD_UPDATED,
    payload: text,
    metadata: {
      hotkey: selectClipKeyPressed(getState()),
    },
  });
};

export const clipKeyPressed = (index) => ({
  type: types.CLIP_KEY_PRESSED,
  payload: index,
});
