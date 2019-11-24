import { combineReducers } from 'redux';
import * as types from './action-types';
import {
  DEFAULT_CLIP_EDITOR_LANG,
} from './constants';

const updateClipsLength = (state, numberOfClips) => {
  if (state.length < numberOfClips) {
    for (let index = 0; index < numberOfClips; index++) {
      if (typeof state[index] !== 'string') state[index] = '';
    }
  }
  return [...state];
};

const clips = (state = [], action) => {
  switch (action.type) {
    case types.CLIPBOARD_UPDATED: {
      if (action.metadata.hotkey) return state;
      const { lockedClips, numberOfClips } = action.metadata;
      const newState = updateClipsLength(state, numberOfClips);
      let lastClip = action.payload;
      return newState.map((clip, index) => {
        if (lockedClips[index]) return clip;
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
    case types.EMPTY_ALL_CLIPS: {
      const { lockedClips, emptyLockedClips } = action.payload;
      return state.map((clip, index) => (
        emptyLockedClips ? '' : (lockedClips[index] ? clip : '')
      ));
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

const settingsVisible = (state = {}, action) => {
  switch (action.type) {
    case types.TOGGLE_CLIP_SETTINGS:
      return {
        ...state,
        [action.payload]: !state[action.payload],
      };
    case types.VIEW_CLIP_EDITOR:
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
    case types.VIEW_CLIP_EDITOR:
      return true;
    case types.RETURN_TO_NORMAL_VIEW:
      return false;
    default:
      return state;
  }
};

const clipBeingViewed = (state = 0, action) => {
  switch (action.type) {
    case types.VIEW_CLIP_EDITOR:
      return action.payload;
    default:
      return state;
  }
};

const clipEditorLang = (state = DEFAULT_CLIP_EDITOR_LANG, action) => {
  switch (action.type) {
    case types.SELECT_EDITOR_LANG:
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

const clipsChanged = (state = false, action) => {
  switch (action.type) {
    case types.CLIPBOARD_UPDATED: {
      if (action.metadata.hotkey) return state;
      return true;
    }
    case types.EMPTY_CLIP:
    case types.EMPTY_ALL_CLIPS:
    case types.CLIP_MODIFIED:
      return true;
    case types.CLIPS_SAVED:
      return false;
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
  clipEditorLang,
  clipCopiedOverlay,
  clipsChanged,
});