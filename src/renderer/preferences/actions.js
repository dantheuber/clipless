import { ipcRenderer } from 'electron';
import * as types from './action-types';
import { alwaysOnTop } from './selectors';
import simpleAction from '../utils/simple-action';

export const toggleAlwaysOnTop = () => (dispatch, getState) => {
  const state = getState();
  const preference = !alwaysOnTop(state);
  dispatch(simpleAction(types.TOGGLE_ALWAYS_ON_TOP));
  ipcRenderer.send('set-always-on-top', { preference });
};