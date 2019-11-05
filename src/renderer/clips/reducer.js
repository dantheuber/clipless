import { combineReducers } from 'redux';
import * as types from './action-types';

const clips = (state = [], action) => {
  switch (action.type) {
    case types.CLIPBOARD_UPDATED: {
      if (action.metadata.hotkey) return state;
      return [action.payload, ...state];
    }
    default:
      return state;
  }
};

const lastKeyUsed = (state = 0, action) => {
  switch (action.type) {
    case types.CLIP_KEY_PRESSED:
      return action.payload;
    case types.CLIPBOARD_UPDATED:
      return 0;
    default:
      return state;
  }
};

const clipKeyPressed = (state = false, action) => {
  switch (action.type) {
    case types.CLIP_KEY_PRESSED:
      return true;
    case types.CLIPBOARD_UPDATED:
      return false;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  clips,
  lastKeyUsed,
  clipKeyPressed,
});