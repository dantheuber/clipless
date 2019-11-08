import { combineReducers } from 'redux';
import * as types from './action-types';
import { DEFAULT_CLIPS_STATE } from './constants';

const clips = (state = DEFAULT_CLIPS_STATE, action) => {
  switch (action.type) {
    case types.CLIPBOARD_UPDATED: {
      if (action.metadata.hotkey) return state;
      let lastClip = action.payload;
      return state.map((clip, index) => {
        if (action.metadata.lockedClips[index]) return clip;
        const value = lastClip;
        lastClip = clip;
        return value;
      });
    }
    case types.CLIP_MODIFIED:{
      const newState = [...state];
      newState[action.metadata.index] = action.payload;
      return newState;
    }
    default:
      return state;
  }
};

const lockedClips = (state = {}, action) => {
  switch (action.type) {
    case types.TOGGLE_LOCK: {
      const lockState = state[action.payload];
      return {
        ...state,
        [action.payload]: !lockState,
      };
    }
    default:
      return state;
  }
};

const lastKeyUsed = (state = 0, action) => {
  switch (action.type) {
    case types.CLIP_SELECTED:
      return action.payload;
    case types.CLIPBOARD_UPDATED:
      return 0;
    default:
      return state;
  }
};

const clipKeyPressed = (state = false, action) => {
  switch (action.type) {
    case types.CLIP_SELECTED:
      return true;
    case types.CLIPBOARD_UPDATED:
      return false;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  clips,
  lockedClips,
  lastKeyUsed,
  clipKeyPressed,
});