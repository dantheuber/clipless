import { combineReducers } from 'redux';
import * as types from './action-types';
import {
  DEFAULT_OPACITY,
  DFEAULT_NUMBER_CLIPS,
  TEMPLATE_PREFS,
  GENERAL_PREFS,
  QUICK_CLIPS,
} from './constants';
import * as compileClipReducers from './compile-templates/reducers';
import { reducer as quickClipLaunchReducer } from './quick-clip-launch/reducers';

const activeView = (state = GENERAL_PREFS, action) => {
  switch(action.type) {
    case types.VIEW_QUICK_CLIPS:
      return QUICK_CLIPS;
    case types.VIEW_TEMPLATES:
      return TEMPLATE_PREFS;
    case types.CLOSE_PREFERENCES:
    case types.VIEW_GENERAL_PREFS:
      return GENERAL_PREFS;
    default:
      return state;
  }
};

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

const opacity = (state = DEFAULT_OPACITY, action) => {
  switch (action.type) {
    case types.SET_OPACITY:
      return action.payload;
    default:
      return state;
  }
};

const numberOfClips = (state = DFEAULT_NUMBER_CLIPS, action) => {
  switch (action.type) {
    case types.SET_NUMBER_OF_CLIPS:
      return action.payload;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  activeView,
  viewingPreferences,
  alwaysOnTop,
  emptyLockedClips,
  transparent,
  opacity,
  numberOfClips,
  ...compileClipReducers,
  quickClips: quickClipLaunchReducer,
});
