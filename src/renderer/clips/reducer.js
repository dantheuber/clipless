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
    case types.EMPTY_CLIP: {
      const newState = [...state];
      newState[action.payload] = '';
      return newState;
    }
    case types.EMPTY_ALL_CLIPS:
      return DEFAULT_CLIPS_STATE;
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

const settingsVisible = (state = {}, action) => {
  switch (action.type) {
    case types.TOGGLE_CLIP_SETTINGS:
      return {
        ...state,
        [action.payload]: !state[action.payload],
      };
    case types.VIEW_MULTI_LINE_EDITOR:
    case types.HIDE_CLIP_SETTINGS:
      return {
        ...state,
        [action.payload]: false,
      };
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

const viewingClipEditor = (state = false, action) => {
  switch (action.type) {
    case types.VIEW_MULTI_LINE_EDITOR:
      return true;
    case types.RETURN_TO_NORMAL_VIEW:
      return false;
    default:
      return state;
  }
};

const clipBeingViewed = (state = 0, action) => {
  switch (action.type) {
    case types.VIEW_MULTI_LINE_EDITOR:
      return action.payload;
    default:
      return state;
  }
};

const clipCopiedOverlay = (state = {}, action) => {
  switch (action.type) {
    case types.CLIP_SELECTED:
      return {
        ...state,
        [action.payload]: true,
      };
    case types.HIDE_COPIED_TOOLTIP:
      return {
        ...state,
        [action.payload]: false,
      };
    default:
      return state;
  }
};

export const reducer = combineReducers({
  clips,
  lockedClips,
  settingsVisible,
  lastKeyUsed,
  clipKeyPressed,
  viewingClipEditor,
  clipBeingViewed,
  clipCopiedOverlay,
});