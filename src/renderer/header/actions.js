import { remote } from 'electron';
import { closePreferences } from '../preferences/actions';
import { cancelSelection as cancelQuickClipSelection } from '../preferences/quick-clip-launch/actions';
import { cancelSelection as cancelTemplateSelection } from '../preferences/compile-templates/actions';
import * as types from './action-types';

export const goBack = () => (dispatch) => {
  dispatch(closePreferences());
  dispatch(cancelQuickClipSelection());
  dispatch(cancelTemplateSelection());
};
export const toggleMenu = () => ({
  type: types.TOGGLE_MENU,
});

export const quitApp = () => () => {
  remote.getCurrentWindow().close();
};
