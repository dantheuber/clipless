import { ipcRenderer } from 'electron';
import * as types from './action-types';
import { alwaysOnTop, transparent } from './selectors';
import simpleAction from '../utils/simple-action';

export const viewGeneralPrefs = simpleAction(types.VIEW_GENERAL_PREFS);
export const viewTemplates = simpleAction(types.VIEW_TEMPLATES);
export const viewQuickClips = simpleAction(types.VIEW_QUICK_CLIPS);

export const viewPreferences = simpleAction(types.VIEW_PREFERENCES);
export const closePreferences = simpleAction(types.CLOSE_PREFERENCES);
export const toggleEmptyLockedClips = simpleAction(types.TOGGLE_EMPTY_LOCKED_CLIPS);

export const toggleAlwaysOnTop = () => (dispatch, getState) => {
  const state = getState();
  const preference = !alwaysOnTop(state);
  dispatch({ type: types.TOGGLE_ALWAYS_ON_TOP });
  ipcRenderer.send('set-always-on-top', { preference });
};

export const toggleTransparent = () => (dispatch, getState) => {
  const state = getState();
  const preference = !transparent(state);
  dispatch({ type: types.TOGGLE_TRANSPARENT });
  ipcRenderer.send('set-transparent', { preference });
};

export const setOpacity = e => (dispatch) => {
  const opacity = Number(e.target.value);
  dispatch({
    type: types.SET_OPACITY,
    payload: opacity,
  });
  ipcRenderer.send('set-opacity', { opacity });
};

export const setNumberOfClips = e => (dispatch) => {
  const numberOfClips = Number(e.target.value);
  dispatch({
    type: types.SET_NUMBER_OF_CLIPS,
    payload: numberOfClips
  });
  ipcRenderer.send('set-number-of-clips', { numberOfClips });
};
