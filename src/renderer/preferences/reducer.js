import { combineReducers } from 'redux';
import * as types from './action-types';

const viewingPreferences = (state = false, action) => {
  switch (action.type) {
    case types.VIEW_PREFERENCES:
      return true;
    case types.CLOSE_PREFERENCES:
      return false;
    default:
      return state;
  }
};

const alwaysOnTop = (state = true, action) => {
  switch (action.type) {
    case types.TOGGLE_ALWAYS_ON_TOP:
      return !state;
    default:
      return state;
  }
};

const emptyLockedClips = (state = true, action) => {
  switch (action.type) {
    case types.TOGGLE_EMPTY_LOCKED_CLIPS:
      return !state;
    default:
      return state;
  }
};

const transparent = (state = false, action) => {
  switch (action.type) {
    case types.TOGGLE_TRANSPARENT:
      return !state;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  viewingPreferences,
  alwaysOnTop,
  emptyLockedClips,
  transparent,
});
