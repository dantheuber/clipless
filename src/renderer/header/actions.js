import { remote } from 'electron';
import * as types from './action-types';

export const toggleMenu = () => ({
  type: types.TOGGLE_MENU,
});

export const hideMenu = () => ({
  type: types.HIDE_MENU,
});

export const quitApp = () => () => {
  remote.getCurrentWindow().close();
};
